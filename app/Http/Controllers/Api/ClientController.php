<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ClientProfile;
use App\Models\Ride;
use App\Models\DriverProfile;
use App\Models\DriverVehicle;
use App\Models\Notification;
use App\Models\SupportTicket;
use App\Models\WalletTransaction;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class ClientController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Client profile not found',
                'data' => null
            ]);
        }

        $clientId = $clientProfile->id;

        $totalRides = Ride::where('client_id', $clientId)->count();
        $completedRides = Ride::where('client_id', $clientId)->where('status', 'completed')->count();
        $activeRides = Ride::where('client_id', $clientId)
            ->whereIn('status', ['pending', 'accepted', 'driver_assigned', 'driver_arrived', 'ongoing', 'awaiting_release'])
            ->count();
        $cancelledRides = Ride::where('client_id', $clientId)
            ->whereIn('status', ['cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])
            ->count();
        $totalSpent = WalletTransaction::where('user_id', $user->id)->where('transaction_type', 'debit')->sum('amount');

        $now = Carbon::now();
        $thisMonthRides = Ride::where('client_id', $clientId)
            ->where('status', 'completed')
            ->whereYear('created_at', $now->year)
            ->whereMonth('created_at', $now->month)
            ->count();
        $lastMonth = $now->copy()->subMonth();
        $lastMonthRides = Ride::where('client_id', $clientId)
            ->where('status', 'completed')
            ->whereYear('created_at', $lastMonth->year)
            ->whereMonth('created_at', $lastMonth->month)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Dashboard stats retrieved successfully',
            'data' => [
                'total_rides' => $totalRides,
                'completed_rides' => $completedRides,
                'active_rides' => $activeRides,
                'cancelled_rides' => $cancelledRides,
                'total_spent' => (float) $totalSpent,
                'monthly_change' => $thisMonthRides - $lastMonthRides,
            ]
        ]);
    }

    public function rides(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Client profile not found',
                'data' => null
            ]);
        }

        $limit = $request->query('limit', 5);

        $rides = Ride::where('client_id', $clientProfile->id)
            ->leftJoin('driver_profiles', 'rides.driver_id', '=', 'driver_profiles.id')
            ->leftJoin('driver_vehicles', 'driver_profiles.id', '=', 'driver_vehicles.driver_id')
            ->leftJoin('users', 'driver_profiles.user_id', '=', 'users.id')
            ->select(
                'rides.id',
                'rides.pickup_address as pickup_location',
                'rides.destination_address as dropoff_location',
                'rides.status',
                'rides.total_fare as fare_amount',
                'rides.ride_type',
                'rides.created_at',
                'users.full_name as driver_name',
                'users.phone_number as driver_phone',
                'driver_vehicles.vehicle_type',
                'driver_vehicles.plate_number'
            )
            ->orderBy('rides.created_at', 'DESC')
            ->limit($limit)
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Recent rides retrieved successfully',
            'data' => $rides
        ]);
    }

    public function rideHistory(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Client profile not found',
                'data' => null
            ]);
        }

        $clientId = $clientProfile->id;
        $status = $request->query('status');

        $totalRides = Ride::where('client_id', $clientId)->count();
        $completedRides = Ride::where('client_id', $clientId)->where('status', 'completed')->count();
        $upcomingRides = Ride::where('client_id', $clientId)
            ->whereIn('status', ['pending', 'accepted', 'driver_assigned', 'driver_arrived'])
            ->count();
        $totalSpent = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'debit')
            ->sum('amount');
        $avgRating = Ride::where('client_id', $clientId)
            ->whereNotNull('driver_rating')
            ->avg('driver_rating');

        $ridesQuery = Ride::where('client_id', $clientId)
            ->when($status, function ($query) use ($status) {
                return $query->where('status', $status);
            })
            ->leftJoin('driver_profiles', 'rides.driver_id', '=', 'driver_profiles.id')
            ->leftJoin('driver_vehicles', 'driver_profiles.id', '=', 'driver_vehicles.driver_id')
            ->leftJoin('users', 'driver_profiles.user_id', '=', 'users.id')
            ->select(
                'rides.id',
                'rides.ride_number',
                'rides.pickup_address',
                'rides.destination_address',
                'rides.status',
                'rides.total_fare',
                'rides.ride_type',
                'rides.distance_km',
                'rides.driver_rating',
                'rides.driver_review',
                'rides.created_at',
                'users.full_name as driver_name',
                'users.phone_number as driver_phone',
                'users.profile_picture_url as driver_photo',
                'driver_vehicles.vehicle_model',
                'driver_vehicles.vehicle_color',
                'driver_vehicles.plate_number'
            )
            ->orderBy('rides.created_at', 'DESC');

        $paginated = $ridesQuery->paginate(15);

        $rides = collect($paginated->items())->map(function ($ride) {
            return [
                'id' => $ride->id,
                'ride_number' => $ride->ride_number ?? '',
                'status' => $ride->status,
                'pickup_address' => $ride->pickup_address,
                'destination_address' => $ride->destination_address,
                'total_fare' => $ride->total_fare ? (float) $ride->total_fare : 0,
                'ride_type' => $ride->ride_type ?? 'economy',
                'distance_km' => $ride->distance_km ? (float) $ride->distance_km : 0,
                'created_at' => $ride->created_at,
                'formatted_date' => $ride->created_at ? Carbon::parse($ride->created_at)->format('M d, Y') : '',
                'formatted_time' => $ride->created_at ? Carbon::parse($ride->created_at)->format('h:i A') : '',
                'driver_name' => $ride->driver_name,
                'driver_photo' => $ride->driver_photo,
                'driver_phone' => $ride->driver_phone,
                'vehicle_model' => $ride->vehicle_model ?? '',
                'vehicle_color' => $ride->vehicle_color ?? '',
                'plate_number' => $ride->plate_number ?? '',
                'user_rating' => $ride->driver_rating,
                'user_review' => $ride->driver_review,
                'can_rate' => in_array($ride->status, ['awaiting_release', 'completed']) && !$ride->driver_rating,
                'payment_status' => $ride->payment_status,
                'can_release_funds' => $ride->status === 'awaiting_release',
            ];
        });

        $lastRide = $rides->first();

        $notifCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'success' => true,
            'message' => 'Ride history retrieved successfully',
            'data' => [
                'stats' => [
                    'total_rides' => $totalRides,
                    'total_spent' => (float) $totalSpent,
                    'avg_rating_given' => $avgRating ? round($avgRating, 1) : 0,
                    'completed_rides' => $completedRides,
                    'upcoming_rides' => $upcomingRides,
                ],
                'rides' => $rides,
                'last_ride' => $lastRide,
                'user' => [
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'phone_number' => $user->phone_number,
                    'profile_picture_url' => $user->profile_picture_url,
                ],
                'notification_count' => $notifCount,
            ]
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        $notifPrefs = $clientProfile ? ($clientProfile->notification_preferences ?? []) : [];
        $defaultNotifPrefs = [
            'notifications_enabled' => $notifPrefs['notifications_enabled'] ?? true,
            'email_notifications' => $notifPrefs['email_notifications'] ?? true,
            'sms_notifications' => $notifPrefs['sms_notifications'] ?? false,
        ];

        $data = [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'profile_picture_url' => $user->profile_picture_url,
            'role' => $user->role,
            'is_verified' => $user->is_verified,
            'created_at' => $user->created_at,
            'notification_preferences' => $defaultNotifPrefs,
            'dark_mode' => $clientProfile ? (bool) $clientProfile->dark_mode : false,
        ];

        if ($clientProfile) {
            $data = array_merge($data, $clientProfile->toArray());
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile retrieved successfully',
            'data' => $data
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'phone_number' => 'sometimes|string|max:20',
            'profile_picture_url' => 'sometimes|url|nullable',
        ]);

        if ($request->has('full_name')) {
            $user->full_name = $request->full_name;
        }
        if ($request->has('email')) {
            $user->email = $request->email;
        }
        if ($request->has('phone_number')) {
            $user->phone_number = $request->phone_number;
        }
        if ($request->has('profile_picture_url')) {
            $user->profile_picture_url = $request->profile_picture_url;
        }
        $user->save();

        if ($clientProfile) {
            $notifFields = ['notifications_enabled', 'email_notifications', 'sms_notifications'];
            $notifPrefs = $clientProfile->notification_preferences ?? [];
            $changed = false;
            foreach ($notifFields as $field) {
                if ($request->has($field)) {
                    $notifPrefs[$field] = filter_var($request->$field, FILTER_VALIDATE_BOOLEAN);
                    $changed = true;
                }
            }
            if ($changed) {
                $clientProfile->notification_preferences = $notifPrefs;
            }

            if ($request->has('dark_mode')) {
                $clientProfile->dark_mode = filter_var($request->dark_mode, FILTER_VALIDATE_BOOLEAN);
            }

            $clientProfile->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => null
        ]);
    }

    public function support(Request $request)
    {
        $request->validate([
            'category' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'required|string',
        ]);

        $normalizedPriority = match(strtolower($request->priority)) {
            'low' => 'low',
            'high' => 'high',
            default => 'normal',
        };

        $user = $request->user();
        $ticketNumber = 'TKT-' . strtoupper(Str::random(8));

        $ticket = SupportTicket::create([
            'user_id' => $user->id,
            'role' => 'client',
            'category' => $request->category,
            'subject' => $request->subject,
            'message' => $request->message,
            'priority' => $normalizedPriority,
            'status' => 'open',
            'ticket_number' => $ticketNumber,
        ]);

        $adminUsers = User::where('role', 'admin')->get();
        foreach ($adminUsers as $admin) {
            Notification::create([
                'id' => Str::random(32),
                'user_id' => $admin->id,
                'type' => 'support_ticket',
                'title' => 'New Support Ticket: ' . $request->subject,
                'message' => 'Ticket ' . $ticketNumber . ' submitted by ' . $user->full_name . ' (' . $normalizedPriority . ' priority)',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Support ticket submitted successfully',
            'ticket_number' => $ticketNumber,
            'data' => [
                'ticket_number' => $ticketNumber,
                'ticket_id' => $ticket->id,
                'status' => 'open',
            ]
        ]);
    }

    public function supportTickets(Request $request)
    {
        $user = $request->user();
        $tickets = SupportTicket::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($ticket) {
                return [
                    'id' => $ticket->id,
                    'ticket_number' => $ticket->ticket_number,
                    'category' => $ticket->category,
                    'subject' => $ticket->subject,
                    'message' => $ticket->message,
                    'priority' => $ticket->priority,
                    'status' => $ticket->status,
                    'admin_reply' => $ticket->admin_reply,
                    'created_at' => $ticket->created_at,
                    'replied_at' => $ticket->replied_at,
                    'closed_at' => $ticket->closed_at,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $tickets,
        ]);
    }
}
