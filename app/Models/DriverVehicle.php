<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverVehicle extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'driver_id', 'vehicle_type', 'vehicle_model',
        'vehicle_color', 'plate_number', 'vehicle_year', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function driver()
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
