<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideCancellation extends Model
{
    public $timestamps = false;
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'ride_id', 'cancelled_by', 'reason', 'cancelled_at'];

    protected $casts = [
        'cancelled_at' => 'datetime',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class, 'ride_id');
    }
}
