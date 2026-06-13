<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\DriverProfile;
use App\Models\DriverVehicle;
use App\Models\Ride;
use App\Models\ClientProfile;
use App\Models\WalletTransaction;
use App\Models\Notification;
use App\Models\DriverRating;
use App\Models\DriverRideDecline;
use App\Models\SupportTicket;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DriverController extends Controller
{
    public function stats(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $today = Carbon::today();

        $totalRides = Ride::where('driver_id', $driverProfile->id)
            ->whereIn('status', ['accepted', 'ongoing', 'completed'])
            ->count();

        $completedRides = Ride::where('driver_id', $driverProfile->id)
            ->where('status', 'completed')
            ->count();

        $cancelledRides = Ride::where('driver_id', $driverProfile->id)
            ->whereIn('status', ['cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])
            ->count();

        $todayRides = Ride::where('driver_id', $driverProfile->id)
            ->where('created_at', '>=', $today)
            ->whereIn('status', ['accepted', 'ongoing', 'completed'])
            ->count();

        $totalEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->sum('amount');

        $todayEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->where('created_at', '>=', $today)
            ->sum('amount');

        $completedRidesQuery = Ride::where('driver_id', $driverProfile->id)
            ->where('status', 'completed');

        $totalFareAmount = (float) $completedRidesQuery->sum('total_fare');
        $totalCommission = (float) $completedRidesQuery->sum('platform_commission');

        $averageRating = DriverRating::where('driver_id', $driverProfile->id)
            ->avg('rating');

        $totalReviews = DriverRating::where('driver_id', $driverProfile->id)
            ->count();

        $avgFare = $completedRides > 0 ? round($totalFareAmount / $completedRides, 2) : 0;

        return response()->json([
            'success' => true,
            'message' => 'Driver stats retrieved successfully',
            'data' => [
                'total_rides' => $totalRides,
                'completed_rides' => $completedRides,
                'cancelled_rides' => $cancelledRides,
                'today_rides' => $todayRides,
                'total_earnings' => $totalEarnings,
                'today_earnings' => $todayEarnings,
                'total_fare_amount' => $totalFareAmount,
                'total_commission' => $totalCommission,
                'avg_fare' => $avgFare,
                'average_rating' => $averageRating ? round($averageRating, 2) : 0,
                'total_reviews' => $totalReviews,
                'driver_status' => $driverProfile->driver_status,
                'verification_status' => $driverProfile->verification_status
            ]
        ]);
    }

    public function rides(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $limit = $request->query('limit', 5);

        $rides = Ride::where(function ($query) use ($driverProfile) {
            $query->where('driver_id', $driverProfile->id)
                ->whereIn('status', ['accepted', 'ongoing', 'awaiting_release', 'completed']);
        })->orWhere(function ($query) use ($driverProfile) {
            $query->where('status', 'pending')
                ->where('driver_id', $driverProfile->id);
        })->with('client.user')
            ->orderBy('created_at', 'DESC')
            ->limit($limit)
            ->get()
            ->map(function ($ride) {
                return [
                    'id' => $ride->id,
                    'ride_number' => $ride->ride_number,
                    'status' => $ride->status,
                    'pickup_address' => $ride->pickup_address,
                    'destination_address' => $ride->destination_address,
                    'pickup_latitude' => $ride->pickup_latitude,
                    'pickup_longitude' => $ride->pickup_longitude,
                    'destination_latitude' => $ride->destination_latitude,
                    'destination_longitude' => $ride->destination_longitude,
                    'ride_type' => $ride->ride_type,
                    'distance_km' => $ride->distance_km,
                    'total_fare' => (float) $ride->total_fare,
                    'driver_payout' => (float) $ride->driver_payout,
                    'platform_commission' => (float) $ride->platform_commission,
                    'created_at' => $ride->created_at,
                    'client_name' => $ride->client?->user?->full_name ?? 'Unknown',
                    'client_phone' => $ride->client?->user?->phone_number ?? '',
                    'client_photo' => $ride->client?->user?->profile_picture_url,
                    'request_type' => 'public',
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Recent rides retrieved successfully',
            'data' => $rides
        ]);
    }

    public function rideHistory(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $driverId = $driverProfile->id;

        // --- Stats ---
        $totalRides = Ride::where('driver_id', $driverId)
            ->whereIn('status', ['accepted', 'ongoing', 'completed'])
            ->count();

        $completedRides = Ride::where('driver_id', $driverId)
            ->where('status', 'completed')
            ->count();

        $cancelledRides = Ride::where('driver_id', $driverId)
            ->where(function ($q) {
                $q->where('status', 'cancelled_by_client')
                  ->orWhere('status', 'cancelled_by_driver')
                  ->orWhere('status', 'cancelled_by_admin');
            })
            ->count();

        $declinedCount = DriverRideDecline::where('driver_id', $driverId)->count();

        $completedQuery = Ride::where('driver_id', $driverId)->where('status', 'completed');

        $totalFareAmount = (float) (clone $completedQuery)->sum('total_fare');
        $totalCommission = (float) (clone $completedQuery)->sum('platform_commission');
        $totalEarnings = (float) (clone $completedQuery)->sum('driver_payout');
        $avgFare = $completedRides > 0 ? round($totalFareAmount / $completedRides, 2) : 0;

        // --- Accepted rides ---
        $acceptedRides = Ride::where('driver_id', $driverId)
            ->with('client.user')
            ->orderBy('created_at', 'DESC')
            ->get()
            ->map(function ($ride) {
                return [
                    'id' => $ride->id,
                    'ride_number' => $ride->ride_number,
                    'status' => $ride->status,
                    'pickup_address' => $ride->pickup_address,
                    'destination_address' => $ride->destination_address,
                    'total_fare' => (float) $ride->total_fare,
                    'driver_payout' => (float) $ride->driver_payout,
                    'platform_commission' => (float) $ride->platform_commission,
                    'created_at' => $ride->created_at,
                    'formatted_date' => $ride->created_at ? $ride->created_at->format('M d, Y') : '',
                    'formatted_time' => $ride->created_at ? $ride->created_at->format('h:i A') : '',
                    'client_name' => $ride->client?->user?->full_name ?? 'Unknown',
                    'client_photo' => $ride->client?->user?->profile_picture_url,
                    'was_declined' => false,
                    'declined_at' => null,
                ];
            });

        // --- Declined rides ---
        $declinedRides = DB::table('rides')
            ->join('ride_declines', 'rides.id', '=', 'ride_declines.ride_id')
            ->join('client_profiles', 'rides.client_id', '=', 'client_profiles.id')
            ->join('users', 'client_profiles.user_id', '=', 'users.id')
            ->where('ride_declines.driver_id', $driverId)
            ->select(
                'rides.id',
                'rides.ride_number',
                'rides.pickup_address',
                'rides.destination_address',
                'rides.total_fare',
                'rides.created_at',
                'ride_declines.created_at as declined_at',
                'ride_declines.auto_decline',
                'users.full_name as client_name',
                'users.profile_picture_url as client_photo'
            )
            ->orderBy('ride_declines.created_at', 'DESC')
            ->get()
            ->map(function ($ride) {
                return [
                    'id' => $ride->id,
                    'ride_number' => $ride->ride_number ?? '',
                    'pickup_address' => $ride->pickup_address,
                    'destination_address' => $ride->destination_address,
                    'total_fare' => (float) $ride->total_fare,
                    'created_at' => $ride->created_at,
                    'formatted_date' => $ride->created_at ? Carbon::parse($ride->created_at)->format('M d, Y') : '',
                    'formatted_time' => $ride->created_at ? Carbon::parse($ride->created_at)->format('h:i A') : '',
                    'client_name' => $ride->client_name ?? 'Unknown',
                    'client_photo' => $ride->client_photo,
                    'declined_at' => $ride->declined_at,
                    'auto_decline' => (bool) $ride->auto_decline,
                ];
            });

        // --- Notification count ---
        $notificationCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        // --- User info ---
        $userData = [
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'profile_picture_url' => $user->profile_picture_url,
        ];

        return response()->json([
            'success' => true,
            'message' => 'Ride history retrieved successfully',
            'data' => [
                'stats' => [
                    'total_rides' => $totalRides,
                    'completed_rides' => $completedRides,
                    'cancelled_rides' => $cancelledRides,
                    'declined_count' => $declinedCount,
                    'total_fare_amount' => $totalFareAmount,
                    'total_earnings' => $totalEarnings,
                    'total_commission' => $totalCommission,
                    'avg_fare' => $avgFare,
                ],
                'accepted_rides' => $acceptedRides,
                'declined_rides' => $declinedRides,
                'user' => $userData,
                'notification_count' => $notificationCount,
            ]
        ]);
    }

    public function pendingRides(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $pendingRides = Ride::where('status', 'pending')
            ->where(function ($query) use ($driverProfile) {
                $query->whereNull('driver_id')
                    ->orWhere('driver_id', $driverProfile->id);
            })
            ->whereNotExists(function ($query) use ($driverProfile) {
                $query->select(DB::raw(1))
                    ->from('ride_declines')
                    ->whereColumn('ride_declines.ride_id', 'rides.id')
                    ->where('ride_declines.driver_id', $driverProfile->id);
            })
            ->with('client.user')
            ->orderBy('created_at', 'ASC')
            ->get()
            ->map(function ($ride) {
                return [
                    'id' => $ride->id,
                    'ride_number' => $ride->ride_number,
                    'status' => $ride->status,
                    'pickup_address' => $ride->pickup_address,
                    'destination_address' => $ride->destination_address,
                    'pickup_latitude' => $ride->pickup_latitude,
                    'pickup_longitude' => $ride->pickup_longitude,
                    'destination_latitude' => $ride->destination_latitude,
                    'destination_longitude' => $ride->destination_longitude,
                    'ride_type' => $ride->ride_type,
                    'distance_km' => $ride->distance_km,
                    'total_fare' => (float) $ride->total_fare,
                    'created_at' => $ride->created_at,
                    'client_name' => $ride->client?->user?->full_name ?? 'Unknown',
                    'client_phone' => $ride->client?->user?->phone_number ?? '',
                    'client_photo' => $ride->client?->user?->profile_picture_url,
                    'request_type' => 'public',
                    'driver_id' => $ride->driver_id,
                ];
            });

        return response()->json([
            'success' => true,
            'message' => 'Pending rides retrieved successfully',
            'data' => $pendingRides
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $vehicle = $driverProfile->vehicle;

        $today = Carbon::today();
        $todayEarnings = WalletTransaction::where('user_id', $user->id)
            ->where('transaction_type', 'credit')
            ->where('created_at', '>=', $today)
            ->sum('amount');

        $notifCount = Notification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        $notifPrefs = $driverProfile->notification_preferences ?? [];
        $defaultNotifPrefs = [
            'ride_requests' => $notifPrefs['ride_requests'] ?? true,
            'earnings_notif' => $notifPrefs['earnings_notif'] ?? true,
            'sound_alerts' => $notifPrefs['sound_alerts'] ?? true,
            'promotions' => $notifPrefs['promotions'] ?? false,
        ];

        $profileData = [
            'id' => $user->id,
            'full_name' => $user->full_name,
            'email' => $user->email,
            'phone_number' => $user->phone_number,
            'profile_picture_url' => $user->profile_picture_url,
            'date_of_birth' => $driverProfile->date_of_birth,
            'gender' => $driverProfile->gender,
            'driver_status' => $driverProfile->driver_status,
            'verification_status' => $driverProfile->verification_status,
            'status' => $driverProfile->driver_status,
            'created_at' => $user->created_at,
            'license_number' => $driverProfile->license_number,
            'license_expiry' => $driverProfile->license_expiry?->format('Y-m-d'),
            'license' => [
                'license_number' => $driverProfile->license_number,
                'license_expiry' => $driverProfile->license_expiry?->format('Y-m-d'),
            ],
            'vehicle' => $vehicle ? [
                'id' => $vehicle->id,
                'vehicle_id' => $vehicle->id,
                'vehicle_model' => $vehicle->vehicle_model,
                'vehicle_color' => $vehicle->vehicle_color,
                'vehicle_year' => $vehicle->vehicle_year,
                'plate_number' => $vehicle->plate_number,
                'vehicle_type' => $vehicle->vehicle_type,
            ] : null,
            'notification_settings' => $defaultNotifPrefs,
            'schedule' => [],
            'today_earnings' => (float) $todayEarnings,
            'total_earnings' => (float) $driverProfile->total_earnings,
            'notification_count' => $notifCount,
        ];

        return response()->json([
            'success' => true,
            'message' => 'Driver profile retrieved successfully',
            'data' => [
                'user' => $profileData,
                'notification_count' => $notifCount,
            ]
        ]);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $request->validate([
            'full_name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|max:255|unique:users,email,' . $user->id,
            'phone_number' => 'sometimes|string|max:20',
            'license_number' => 'sometimes|string|max:50',
            'license_expiry' => 'sometimes|date',
            'date_of_birth' => 'sometimes|date',
            'gender' => 'sometimes|string|in:male,female,other,prefer-not-to-say',
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
        $user->save();

        if ($request->has('license_number')) {
            $driverProfile->license_number = $request->license_number;
        }
        if ($request->has('license_expiry')) {
            $driverProfile->license_expiry = $request->license_expiry;
        }
        if ($request->has('date_of_birth')) {
            $driverProfile->date_of_birth = $request->date_of_birth;
        }
        if ($request->has('gender')) {
            $driverProfile->gender = $request->gender;
        }

        $notifFields = ['ride_requests', 'earnings_notif', 'sound_alerts', 'promotions'];
        $notifPrefs = $driverProfile->notification_preferences ?? [];
        $changed = false;
        foreach ($notifFields as $field) {
            if ($request->has($field)) {
                $notifPrefs[$field] = filter_var($request->$field, FILTER_VALIDATE_BOOLEAN);
                $changed = true;
            }
        }
        if ($changed) {
            $driverProfile->notification_preferences = $notifPrefs;
        }

        $driverProfile->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully'
        ]);
    }

    public function toggleStatus(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $request->validate([
            'status' => 'required|in:online,offline'
        ]);

        $newStatus = $request->status;
        $previousStatus = $driverProfile->driver_status;

        if ($newStatus === 'online' && $driverProfile->verification_status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Driver must be verified before going online'
            ]);
        }

        $driverProfile->driver_status = $newStatus;
        $driverProfile->save();

        if ($newStatus === 'online' && $previousStatus !== 'online') {
            Notification::create([
                'id' => Str::random(32),
                'user_id' => $user->id,
                'type' => 'driver_status',
                'title' => 'Status Updated',
                'message' => 'You are now online and can receive ride requests',
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Status updated successfully',
            'data' => [
                'status' => $newStatus,
                'previous_status' => $previousStatus
            ]
        ]);
    }

    public function updateLocation(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180'
        ]);

        $driverProfile->current_latitude = $request->lat;
        $driverProfile->current_longitude = $request->lng;
        $driverProfile->last_location_update = now();
        $driverProfile->save();

        return response()->json([
            'success' => true,
            'message' => 'Location updated successfully'
        ]);
    }

    public function getNearbyDrivers(Request $request)
    {
        $request->validate([
            'lat' => 'required|numeric|between:-90,90',
            'lng' => 'required|numeric|between:-180,180',
            'radius_km' => 'sometimes|numeric|min:0.1|max:100'
        ]);

        $lat = $request->lat;
        $lng = $request->lng;
        $radiusKm = $request->radius_km ?? 50;

        $drivers = DriverProfile::whereIn('driver_status', ['online', 'on_ride'])
            ->where('verification_status', 'approved')
            ->whereNotNull('current_latitude')
            ->whereNotNull('current_longitude')
            ->whereHas('user')
            ->selectRaw("
                *,
                (6371 * acos(cos(radians(?)) * cos(radians(current_latitude)) * cos(radians(current_longitude) - radians(?)) + sin(radians(?)) * sin(radians(current_latitude)))) AS distance
            ", [$lat, $lng, $lat])
            ->orderByRaw("CASE WHEN driver_status = 'online' THEN 0 ELSE 1 END")
            ->orderBy('distance')
            ->with('user')
            ->with('vehicle')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Nearby drivers retrieved successfully',
            'data' => $drivers
        ]);
    }

    public function updateVehicle(Request $request)
    {
        $user = $request->user();
        $driverProfile = $user->driverProfile;

        if (!$driverProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Driver profile not found'
            ]);
        }

        $request->validate([
            'vehicle_type' => 'sometimes|string|max:50',
            'vehicle_model' => 'sometimes|string|max:100',
            'vehicle_color' => 'sometimes|string|max:50',
            'plate_number' => 'sometimes|string|max:20',
            'vehicle_year' => 'sometimes|string|max:4',
        ]);

        $vehicle = DriverVehicle::where('driver_id', $driverProfile->id)->first();

        if ($vehicle) {
            $vehicle->update($request->only(['vehicle_type', 'vehicle_model', 'vehicle_color', 'plate_number', 'vehicle_year']));
        } else {
            $vehicle = DriverVehicle::create([
                'id' => (string) Str::uuid(),
                'driver_id' => $driverProfile->id,
                ...$request->only(['vehicle_type', 'vehicle_model', 'vehicle_color', 'plate_number', 'vehicle_year'])
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Vehicle updated successfully',
            'data' => $vehicle
        ]);
    }

    public function support(Request $request)
    {
        $request->validate([
            'category' => 'required|string|max:50',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'sometimes|string'
        ]);

        $priority = $request->priority ?? 'normal';
        $normalizedPriority = match(strtolower($priority)) {
            'low' => 'low',
            'high' => 'high',
            default => 'normal',
        };

        $user = $request->user();
        $ticketNumber = 'TKT-' . strtoupper(Str::random(8));

        $ticket = SupportTicket::create([
            'user_id' => $user->id,
            'role' => 'driver',
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
