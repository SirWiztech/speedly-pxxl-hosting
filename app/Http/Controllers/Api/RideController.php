<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\ClientProfile;
use App\Models\DriverProfile;
use App\Models\DriverVehicle;
use App\Models\Ride;
use App\Models\RideCancellation;
use App\Models\WalletTransaction;
use App\Models\Notification;
use App\Models\DriverRating;
use App\Models\ClientRating;
use App\Models\DriverRideDecline;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class RideController extends Controller
{
    public function getRideTypes(Request $request)
    {
        return response()->json(['success' => true, 'data' => [
            ['id' => 'economy', 'name' => 'Economy', 'base_fare' => 500, 'per_km' => 150, 'icon' => '🚗'],
            ['id' => 'comfort', 'name' => 'Comfort', 'base_fare' => 800, 'per_km' => 250, 'icon' => '🚙'],
            ['id' => 'premium', 'name' => 'Premium', 'base_fare' => 1500, 'per_km' => 400, 'icon' => '🚘'],
        ]]);
    }

    public function activeRide(Request $request)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        $ride = null;
        if ($clientProfile) {
            $ride = Ride::with(['driver.user', 'client.user'])
                ->where('client_id', $clientProfile->id)
                ->whereNotIn('status', ['completed', 'cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])
                ->latest()
                ->first();
        } elseif ($driverProfile) {
            $ride = Ride::with(['driver.user', 'client.user'])
                ->where('driver_id', $driverProfile->id)
                ->whereNotIn('status', ['completed', 'cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])
                ->latest()
                ->first();
        }

        if (!$ride) {
            return response()->json(['success' => true, 'data' => null]);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $ride->id,
                'ride_number' => $ride->ride_number,
                'status' => $ride->status,
                'driver_name' => $ride->driver?->user?->full_name,
                'client_name' => $ride->client?->user?->full_name,
                'user_role' => $clientProfile ? 'client' : 'driver',
            ],
        ]);
    }

    public function calculateFare(Request $request)
    {
        $request->validate([
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'dropoff_lat' => 'required|numeric',
            'dropoff_lng' => 'required|numeric',
            'ride_type' => 'required|in:economy,comfort,premium',
        ]);

        $pickupLat = $request->pickup_lat;
        $pickupLng = $request->pickup_lng;
        $dropoffLat = $request->dropoff_lat;
        $dropoffLng = $request->dropoff_lng;

        $distance = DB::selectOne("
            SELECT (6371 * acos(
                cos(radians(?)) * cos(radians(?)) * cos(radians(?) - radians(?)) +
                sin(radians(?)) * sin(radians(?))
            )) as distance
        ", [$pickupLat, $dropoffLat, $dropoffLng, $pickupLng, $pickupLat, $dropoffLat])->distance;

        $rideTypes = [
            'economy' => ['base_fare' => 500, 'per_km' => 150],
            'comfort' => ['base_fare' => 800, 'per_km' => 250],
            'premium' => ['base_fare' => 1500, 'per_km' => 400],
        ];

        $rideType = $rideTypes[$request->ride_type];
        $estimatedFare = $rideType['base_fare'] + ($distance * $rideType['per_km']);
        $durationMin = $distance * 3;

        return response()->json([
            'success' => true,
            'data' => [
                'distance_km' => round($distance, 2),
                'estimated_fare' => round($estimatedFare, 2),
                'ride_type' => $request->ride_type,
                'duration_min' => round($durationMin, 0),
            ],
        ]);
    }

    private function getWalletBalance(string $userId): float
    {
        $creditTypes = ['deposit', 'bonus', 'referral', 'ride_refund', 'credit'];
        $debitTypes = ['withdrawal', 'ride_payment', 'debit'];

        $credit = WalletTransaction::where('user_id', $userId)
            ->whereIn('transaction_type', $creditTypes)
            ->where('status', 'completed')
            ->sum('amount');

        $debit = WalletTransaction::where('user_id', $userId)
            ->whereIn('transaction_type', $debitTypes)
            ->where('status', 'completed')
            ->sum('amount');

        return $credit - $debit;
    }

    public function book(Request $request)
    {
        $request->validate([
            'pickup_location' => 'required|string',
            'dropoff_location' => 'required|string',
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'dropoff_lat' => 'required|numeric',
            'dropoff_lng' => 'required|numeric',
            'ride_type' => 'required|in:economy,comfort,premium',
        ]);

        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json(['success' => false, 'message' => 'Client profile not found'], 404);
        }

        $pickupLat = $request->pickup_lat;
        $pickupLng = $request->pickup_lng;
        $dropoffLat = $request->dropoff_lat;
        $dropoffLng = $request->dropoff_lng;

        $distance = DB::selectOne("
            SELECT (6371 * acos(
                cos(radians(?)) * cos(radians(?)) * cos(radians(?) - radians(?)) +
                sin(radians(?)) * sin(radians(?))
            )) as distance
        ", [$pickupLat, $dropoffLat, $dropoffLng, $pickupLng, $pickupLat, $dropoffLat])->distance;

        $rideTypes = [
            'economy' => ['base_fare' => 500, 'per_km' => 150],
            'comfort' => ['base_fare' => 800, 'per_km' => 250],
            'premium' => ['base_fare' => 1500, 'per_km' => 400],
        ];

        $rideType = $rideTypes[$request->ride_type];
        $totalFare = round($rideType['base_fare'] + ($distance * $rideType['per_km']), 2);
        $platformCommission = round($totalFare * 0.15, 2);
        $driverPayout = round($totalFare - $platformCommission, 2);

        $balanceBefore = $this->getWalletBalance($user->id);

        if ($balanceBefore < $totalFare) {
            return response()->json([
                'success' => false,
                'insufficient_balance' => true,
                'message' => 'Insufficient wallet balance. Please top up your wallet.',
                'data' => [
                    'balance' => $balanceBefore,
                    'required' => $totalFare,
                    'shortfall' => round($totalFare - $balanceBefore, 2),
                ],
            ], 400);
        }

        $balanceAfter = round($balanceBefore - $totalFare, 2);
        $reference = 'RIDE-' . strtoupper(Str::random(12));
        $rideId = Str::random(32);

        DB::beginTransaction();
        try {
            $ride = Ride::create([
                'id' => $rideId,
                'ride_number' => 'RIDE-' . strtoupper(Str::random(8)),
                'client_id' => $clientProfile->id,
                'pickup_address' => $request->pickup_location,
                'destination_address' => $request->dropoff_location,
                'pickup_latitude' => $pickupLat,
                'pickup_longitude' => $pickupLng,
                'destination_latitude' => $dropoffLat,
                'destination_longitude' => $dropoffLng,
                'ride_type' => $request->ride_type,
                'total_fare' => $totalFare,
                'platform_commission' => $platformCommission,
                'driver_payout' => $driverPayout,
                'distance_km' => round($distance, 2),
                'status' => 'pending',
                'payment_status' => 'held',
            ]);

            WalletTransaction::create([
                'id' => Str::random(32),
                'user_id' => $user->id,
                'transaction_type' => 'ride_payment',
                'amount' => $totalFare,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference' => $reference,
                'status' => 'completed',
                'category' => 'ride_booking',
                'description' => "Payment for ride #{$ride->ride_number}",
                'ride_id' => $rideId,
            ]);

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $admin->id,
                    'type' => 'new_ride',
                    'title' => 'New Ride Booking',
                    'message' => "A new ride has been booked by {$user->full_name}.",
                    'is_read' => false,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Ride booked successfully',
                'data' => $ride,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to book ride. Please try again.',
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $ride = Ride::with(['client.user', 'driver.user', 'driver.vehicles', 'cancellation'])->find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        return response()->json(['success' => true, 'data' => $ride]);
    }

    public function receipt(Request $request, $id)
    {
        $ride = Ride::with(['client.user', 'driver.user', 'driver.vehicle'])->find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        if (in_array($ride->status, ['cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])) {
            return response()->json(['success' => false, 'message' => 'Receipt not available for cancelled rides'], 400);
        }

        $ride->distance_km = (float) $ride->distance_km;
        $ride->total_fare = (float) $ride->total_fare;
        $ride->platform_commission = (float) ($ride->platform_commission ?? 0);
        $ride->driver_payout = (float) ($ride->driver_payout ?? 0);

        $vehicle = $ride->driver?->vehicle;

        $ride->client_name = $ride->client?->user?->full_name ?? 'Customer';
        $ride->client_email = $ride->client?->user?->email ?? '';
        $ride->client_phone = $ride->client?->user?->phone_number ?? '';
        $ride->driver_name = $ride->driver?->user?->full_name;
        $ride->driver_phone = $ride->driver?->user?->phone_number ?? '';

        if (!$ride->release_token) {
            $token = Str::random(32);
            Ride::where('id', $ride->id)->update(['release_token' => $token]);
            $ride->release_token = $token;
        }

        $ride->vehicle_model = $vehicle?->vehicle_model ?? '';
        $ride->vehicle_color = $vehicle?->vehicle_color ?? '';
        $ride->plate_number = $vehicle?->plate_number ?? '';

        $fareBreakdown = [
            'base_fare' => $ride->total_fare * 0.6,
            'distance_fare' => $ride->total_fare * 0.4,
            'service_fee' => $ride->total_fare * 0.05,
            'platform_commission' => $ride->platform_commission ?? $ride->total_fare * 0.2,
            'driver_payout' => $ride->driver_payout ?? $ride->total_fare - $ride->platform_commission,
            'total' => $ride->total_fare,
        ];

        return response()->json(['success' => true, 'data' => ['ride' => $ride, 'fare_breakdown' => $fareBreakdown]]);
    }

    public function accept(Request $request, $id)
    {
        $user = $request->user();

        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Driver profile not found'], 404);
        }

        if ($driverProfile->driver_status !== 'online' || $driverProfile->verification_status !== 'approved') {
            return response()->json(['success' => false, 'message' => 'Driver must be online and verified'], 403);
        }

        return DB::transaction(function () use ($id, $user, $driverProfile) {
            $ride = Ride::lockForUpdate()->find($id);

            if (!$ride) {
                return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
            }

            if ($ride->status !== 'pending') {
                return response()->json(['success' => false, 'message' => 'Ride is not available for acceptance'], 400);
            }

            $ride->update([
                'driver_id' => $driverProfile->id,
                'status' => 'accepted',
            ]);

            Notification::create([
                'id' => Str::random(32),
                'user_id' => $ride->client->user_id,
                'type' => 'ride_accepted',
                'title' => 'Ride Accepted',
                'message' => 'Your ride has been accepted by a driver. They are on the way to pick you up.',
                'is_read' => false,
            ]);

            return response()->json(['success' => true, 'message' => 'Ride accepted successfully']);
        });
    }

    public function decline(Request $request, $id)
    {
        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Driver profile not found'], 404);
        }

        $ride = Ride::find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        if ($ride->status !== 'pending') {
            return response()->json(['success' => false, 'message' => 'Ride is no longer available'], 400);
        }

        DriverRideDecline::create([
            'id' => Str::uuid(),
            'ride_id' => $ride->id,
            'driver_id' => $driverProfile->id,
            'auto_decline' => false,
        ]);

        return response()->json(['success' => true, 'message' => 'Ride declined']);
    }

    public function complete(Request $request, $id)
    {
        $user = $request->user();

        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Driver profile not found'], 404);
        }

        return DB::transaction(function () use ($id, $user, $driverProfile) {
            $ride = Ride::with('client.user')->lockForUpdate()->find($id);

            if (!$ride) {
                return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
            }

            if ($ride->driver_id !== $driverProfile->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            if (!in_array($ride->status, ['accepted', 'ongoing'])) {
                return response()->json(['success' => false, 'message' => 'Ride cannot be completed. Current status: ' . $ride->status], 400);
            }

            $ride->update([
                'status' => 'awaiting_release',
                'completed_at' => Carbon::now(),
                'payment_status' => 'pending',
            ]);

            $clientUserId = $ride->client?->user_id;
            if ($clientUserId) {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $clientUserId,
                    'type' => 'awaiting_release',
                    'title' => 'Release Funds Required',
                    'message' => "Your ride #{$ride->ride_number} has ended. Please release ₦{$ride->total_fare} to the driver.",
                    'is_read' => false,
                ]);
            }

            return response()->json(['success' => true, 'message' => 'Ride ended. Awaiting client to release funds.']);
        });
    }

    public function cancel(Request $request, $id)
    {
        $request->validate([
            'reason' => 'nullable|string',
        ]);

        $user = $request->user();

        $ride = Ride::find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        $clientProfile = ClientProfile::where('user_id', $user->id)->first();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        $isClient = $clientProfile && $ride->client_id === $clientProfile->id;
        $isDriver = $driverProfile && $ride->driver_id === $driverProfile->id;

        if (!$isClient && !$isDriver) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (in_array($ride->status, ['awaiting_release', 'completed', 'cancelled_by_client', 'cancelled_by_driver', 'cancelled_by_admin'])) {
            return response()->json(['success' => false, 'message' => 'Ride cannot be cancelled'], 400);
        }

        return DB::transaction(function () use ($ride, $request, $user, $isClient, $isDriver) {
            $ride->update([
                'status' => $isClient ? 'cancelled_by_client' : 'cancelled_by_driver',
            ]);

            RideCancellation::create([
                'id' => Str::random(32),
                'ride_id' => $ride->id,
                'cancelled_by' => $isClient ? 'client' : 'driver',
                'reason' => $request->reason,
                'cancelled_at' => Carbon::now(),
            ]);

            // Refund client's wallet
            $clientUser = $ride->client->user;
            $lastClientTx = WalletTransaction::where('user_id', $clientUser->id)
                ->orderBy('created_at', 'desc')->first();
            $clientBalanceBefore = $lastClientTx ? $lastClientTx->balance_after : 0;
            $clientBalanceAfter = $clientBalanceBefore + $ride->total_fare;

            WalletTransaction::create([
                'id' => Str::uuid(),
                'user_id' => $clientUser->id,
                'transaction_type' => 'ride_refund',
                'description' => "Refund for cancelled ride #{$ride->ride_number}",
                'amount' => $ride->total_fare,
                'balance_before' => $clientBalanceBefore,
                'balance_after' => $clientBalanceAfter,
                'status' => 'completed',
                'ride_id' => $ride->id,
            ]);

            if ($isDriver) {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $ride->client->user_id,
                    'type' => 'ride_cancelled',
                    'title' => 'Ride Cancelled',
                    'message' => "The driver has cancelled ride #{$ride->ride_number}. ₦{$ride->total_fare} has been refunded to your wallet.",
                    'is_read' => false,
                ]);
            } elseif ($isClient && $ride->driver_id) {
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $ride->driver->user_id,
                    'type' => 'ride_cancelled',
                    'title' => 'Ride Cancelled',
                    'message' => 'The client has cancelled the ride.',
                    'is_read' => false,
                ]);
                Notification::create([
                    'id' => Str::random(32),
                    'user_id' => $ride->client->user_id,
                    'type' => 'ride_refund',
                    'title' => 'Refund Processed',
                    'message' => "₦{$ride->total_fare} has been refunded to your wallet for ride #{$ride->ride_number}.",
                    'is_read' => false,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Ride cancelled and refund processed.',
                'data' => [
                    'refund_amount' => $ride->total_fare,
                    'new_balance' => $clientBalanceAfter,
                ]
            ]);
        });
    }

    public function rateDriver(Request $request, $id)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json(['success' => false, 'message' => 'Client profile not found'], 404);
        }

        $ride = Ride::find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        if ($ride->client_id !== $clientProfile->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (!in_array($ride->status, ['awaiting_release', 'completed'])) {
            return response()->json(['success' => false, 'message' => 'Can only rate after ride ends'], 400);
        }

        DriverRating::create([
            'id' => Str::uuid(),
            'ride_id' => $ride->id,
            'user_id' => $user->id,
            'driver_id' => $ride->driver_id,
            'rating' => $request->rating,
            'review' => $request->comment,
        ]);

        $driverProfile = $ride->driver;
        $avgRating = DriverRating::where('driver_id', $driverProfile->id)->avg('rating');
        $totalReviews = DriverRating::where('driver_id', $driverProfile->id)->count();
        $driverProfile->update([
            'average_rating' => round($avgRating, 2),
            'total_reviews' => $totalReviews,
        ]);

        return response()->json(['success' => true, 'message' => 'Driver rated successfully']);
    }

    public function releaseFunds(Request $request, $id)
    {
        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->first();

        if (!$clientProfile) {
            return response()->json(['success' => false, 'message' => 'Client profile not found'], 404);
        }

        return DB::transaction(function () use ($id, $user, $clientProfile) {
            $ride = Ride::lockForUpdate()->find($id);

            if (!$ride) {
                return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
            }

            if ($ride->client_id !== $clientProfile->id) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
            }

            if ($ride->status !== 'awaiting_release') {
                return response()->json(['success' => false, 'message' => 'Funds are not ready to be released'], 400);
            }

            if ($ride->payment_status === 'paid') {
                return response()->json(['success' => false, 'message' => 'Funds already released'], 400);
            }

            $clientUser = $user;
            $driverUser = $ride->driver->user;

            $lastClientTx = WalletTransaction::where('user_id', $clientUser->id)
                ->orderBy('created_at', 'desc')->first();
            $clientBalanceBefore = $lastClientTx ? $lastClientTx->balance_after : 0;
            $clientBalanceAfter = $clientBalanceBefore - $ride->total_fare;

            WalletTransaction::create([
                'id' => Str::uuid(),
                'user_id' => $clientUser->id,
                'transaction_type' => 'debit',
                'description' => "Payment for ride {$ride->ride_number}",
                'amount' => $ride->total_fare,
                'balance_before' => $clientBalanceBefore,
                'balance_after' => $clientBalanceAfter,
                'status' => 'completed',
                'ride_id' => $ride->id,
            ]);

            $driverEarning = $ride->driver_payout ?? ($ride->total_fare * 0.85);

            $lastDriverTx = WalletTransaction::where('user_id', $driverUser->id)
                ->orderBy('created_at', 'desc')->first();
            $driverBalanceBefore = $lastDriverTx ? $lastDriverTx->balance_after : 0;
            $driverBalanceAfter = $driverBalanceBefore + $driverEarning;

            WalletTransaction::create([
                'id' => Str::uuid(),
                'user_id' => $driverUser->id,
                'transaction_type' => 'credit',
                'description' => "Earning from ride {$ride->ride_number}",
                'amount' => $driverEarning,
                'balance_before' => $driverBalanceBefore,
                'balance_after' => $driverBalanceAfter,
                'status' => 'completed',
                'ride_id' => $ride->id,
            ]);

            $ride->update([
                'status' => 'completed',
                'payment_status' => 'paid',
            ]);

            $driverProfile = $ride->driver;
            $driverProfile->update([
                'completed_rides' => Ride::where('driver_id', $driverProfile->id)->where('status', 'completed')->count(),
                'total_earnings' => ($driverProfile->total_earnings ?? 0) + $driverEarning,
            ]);

            Notification::create([
                'id' => Str::random(32),
                'user_id' => $driverUser->id,
                'type' => 'payment_released',
                'title' => 'Payment Released',
                'message' => "₦{$driverEarning} has been released for ride {$ride->ride_number}",
                'is_read' => false,
            ]);

            return response()->json(['success' => true, 'message' => 'Funds released to driver successfully']);
        });
    }

    public function qrRelease(Request $request, $id)
    {
        $request->validate(['release_token' => 'required|string']);

        return DB::transaction(function () use ($id, $request) {
            $ride = Ride::with(['client.user', 'driver.user'])->lockForUpdate()
                ->where('id', $id)
                ->where('release_token', $request->release_token)
                ->first();

            if (!$ride) {
                return response()->json(['success' => false, 'message' => 'Invalid ride or token'], 404);
            }

            if ($ride->status !== 'awaiting_release') {
                return response()->json(['success' => false, 'message' => 'Funds are not ready to be released'], 400);
            }

            if ($ride->payment_status === 'paid') {
                return response()->json(['success' => false, 'message' => 'Funds already released'], 400);
            }

            if (!$ride->client?->user || !$ride->driver?->user) {
                return response()->json(['success' => false, 'message' => 'Ride is not fully assigned yet'], 400);
            }

            $clientUser = $ride->client->user;
            $driverUser = $ride->driver->user;

            $lastClientTx = WalletTransaction::where('user_id', $clientUser->id)
                ->orderBy('created_at', 'desc')->first();
            $clientBalanceBefore = $lastClientTx ? $lastClientTx->balance_after : 0;
            $clientBalanceAfter = $clientBalanceBefore - $ride->total_fare;

            WalletTransaction::create([
                'id' => Str::random(32),
                'user_id' => $clientUser->id,
                'transaction_type' => 'debit',
                'description' => "QR release for ride {$ride->ride_number}",
                'amount' => $ride->total_fare,
                'balance_before' => $clientBalanceBefore,
                'balance_after' => $clientBalanceAfter,
                'status' => 'completed',
                'ride_id' => $ride->id,
            ]);

            $driverEarning = $ride->driver_payout ?? ($ride->total_fare * 0.85);

            $lastDriverTx = WalletTransaction::where('user_id', $driverUser->id)
                ->orderBy('created_at', 'desc')->first();
            $driverBalanceBefore = $lastDriverTx ? $lastDriverTx->balance_after : 0;
            $driverBalanceAfter = $driverBalanceBefore + $driverEarning;

            WalletTransaction::create([
                'id' => Str::random(32),
                'user_id' => $driverUser->id,
                'transaction_type' => 'credit',
                'description' => "QR release earning from ride {$ride->ride_number}",
                'amount' => $driverEarning,
                'balance_before' => $driverBalanceBefore,
                'balance_after' => $driverBalanceAfter,
                'status' => 'completed',
                'ride_id' => $ride->id,
            ]);

            $ride->update(['status' => 'completed', 'payment_status' => 'paid']);

            $driverProfile = $ride->driver;
            $driverProfile->update([
                'completed_rides' => Ride::where('driver_id', $driverProfile->id)->where('status', 'completed')->count(),
                'total_earnings' => ($driverProfile->total_earnings ?? 0) + $driverEarning,
            ]);

            Notification::create([
                'id' => Str::random(32),
                'user_id' => $driverUser->id,
                'type' => 'payment_released',
                'title' => 'Payment Released (QR)',
                'message' => "₦{$driverEarning} released via QR scan for ride {$ride->ride_number}",
                'is_read' => false,
            ]);

            return response()->json(['success' => true, 'message' => 'Funds released via QR scan']);
        });
    }

    public function rateClient(Request $request, $id)
    {
        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string',
        ]);

        $user = $request->user();
        $driverProfile = DriverProfile::where('user_id', $user->id)->first();

        if (!$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Driver profile not found'], 404);
        }

        $ride = Ride::find($id);

        if (!$ride) {
            return response()->json(['success' => false, 'message' => 'Ride not found'], 404);
        }

        if ($ride->driver_id !== $driverProfile->id) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        if (!in_array($ride->status, ['awaiting_release', 'completed'])) {
            return response()->json(['success' => false, 'message' => 'Can only rate after ride ends'], 400);
        }

        ClientRating::create([
            'id' => Str::uuid(),
            'ride_id' => $ride->id,
            'user_id' => $user->id,
            'client_id' => $ride->client_id,
            'rating' => $request->rating,
            'review' => $request->comment,
        ]);

        return response()->json(['success' => true, 'message' => 'Client rated successfully']);
    }
}
