<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\ChatMessageSent;
use App\Models\Chat;
use App\Models\Ride;
use App\Models\ClientProfile;
use App\Models\DriverProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ChatController extends Controller
{
    public function history(Request $request, $rideId)
    {
        $ride = Ride::find($rideId);
        if (!$ride) return response()->json(['success' => false, 'message' => 'Ride not found'], 404);

        $user = $request->user();
        $isClient = ClientProfile::where('user_id', $user->id)->where('id', $ride->client_id)->exists();
        $isDriver = DriverProfile::where('user_id', $user->id)->where('id', $ride->driver_id)->exists();

        if (!$isClient && !$isDriver) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $messages = Chat::where('ride_id', $rideId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json(['success' => true, 'data' => $messages]);
    }

    public function send(Request $request, $rideId)
    {
        $request->validate(['message' => 'required|string|max:1000']);

        $ride = Ride::find($rideId);
        if (!$ride) return response()->json(['success' => false, 'message' => 'Ride not found'], 404);

        $user = $request->user();
        $clientProfile = ClientProfile::where('user_id', $user->id)->where('id', $ride->client_id)->first();
        $driverProfile = DriverProfile::where('user_id', $user->id)->where('id', $ride->driver_id)->first();

        if (!$clientProfile && !$driverProfile) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $role = $clientProfile ? 'client' : 'driver';

        $chat = Chat::create([
            'id' => Str::random(32),
            'ride_id' => $rideId,
            'sender_id' => $user->id,
            'sender_role' => $role,
            'message' => $request->message,
        ]);

        $payload = [
            'id' => $chat->id,
            'ride_id' => $rideId,
            'sender_id' => $user->id,
            'sender_role' => $role,
            'message' => $request->message,
            'created_at' => $chat->created_at->toISOString(),
        ];

        try {
            broadcast(new ChatMessageSent($rideId, $payload));
            \Log::info('Chat broadcast OK', ['ride' => $rideId, 'role' => $role]);
        } catch (\Throwable $e) {
            \Log::error('Chat broadcast FAILED', ['error' => $e->getMessage()]);
        }

        return response()->json(['success' => true, 'data' => $payload]);
    }
}
