<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientRating extends Model
{
    const UPDATED_AT = null;
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'ride_id', 'user_id', 'client_id', 'rating', 'review',
    ];

    protected $casts = [
        'rating' => 'integer',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class, 'ride_id');
    }

    public function client()
    {
        return $this->belongsTo(ClientProfile::class, 'client_id');
    }
}
