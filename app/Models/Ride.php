<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Ride extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'ride_number', 'client_id', 'driver_id',
        'pickup_address', 'pickup_latitude', 'pickup_longitude', 'pickup_place_id',
        'destination_address', 'destination_latitude', 'destination_longitude', 'dest_place_id',
        'ride_type', 'distance_km', 'total_fare', 'platform_commission', 'driver_payout',
        'status', 'payment_status', 'payment_method', 'release_token',
        'client_rating', 'client_review', 'driver_rating', 'driver_review',
        'completed_at',
    ];

    protected $casts = [
        'pickup_latitude' => 'decimal:8',
        'pickup_longitude' => 'decimal:8',
        'destination_latitude' => 'decimal:8',
        'destination_longitude' => 'decimal:8',
        'distance_km' => 'decimal:2',
        'total_fare' => 'decimal:2',
        'platform_commission' => 'decimal:2',
        'driver_payout' => 'decimal:2',
        'client_rating' => 'integer',
        'driver_rating' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(ClientProfile::class, 'client_id');
    }

    public function driver()
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }

    public function walletTransactions()
    {
        return $this->hasMany(WalletTransaction::class, 'ride_id');
    }

    public function cancellation()
    {
        return $this->hasOne(RideCancellation::class, 'ride_id');
    }

    public function driverRating()
    {
        return $this->hasOne(DriverRating::class, 'ride_id');
    }

    public function clientRating()
    {
        return $this->hasOne(ClientRating::class, 'ride_id');
    }
}
