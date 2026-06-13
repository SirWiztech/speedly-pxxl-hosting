<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat.{rideId}', function ($user, $rideId) {
    $ride = \App\Models\Ride::find($rideId);
    if (!$ride) return false;

    $isClient = \App\Models\ClientProfile::where('user_id', $user->id)->where('id', $ride->client_id)->exists();
    $isDriver = \App\Models\DriverProfile::where('user_id', $user->id)->where('id', $ride->driver_id)->exists();

    return $isClient || $isDriver;
});
