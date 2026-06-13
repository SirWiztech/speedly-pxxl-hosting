<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverApprovalQueue extends Model
{
    const UPDATED_AT = null;
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'driver_id', 'status', 'reviewed_by',
        'review_notes', 'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function driver()
    {
        return $this->belongsTo(DriverProfile::class, 'driver_id');
    }
}
