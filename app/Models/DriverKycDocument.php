<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverKycDocument extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'driver_id', 'document_type', 'document_url',
        'verification_status', 'verified_by', 'rejection_reason', 'verified_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function driver()
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
