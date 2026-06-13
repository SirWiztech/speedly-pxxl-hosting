<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSession extends Model
{
    const UPDATED_AT = null;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'transaction_reference', 'session_id', 'user_id', 'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
