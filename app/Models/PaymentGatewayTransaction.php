<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentGatewayTransaction extends Model
{
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'user_id', 'transaction_reference', 'amount',
        'currency', 'status', 'payment_method', 'gateway_reference',
        'gateway_response', 'webhook_data', 'webhook_received', 'expires_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gateway_response' => 'array',
        'webhook_data' => 'array',
        'webhook_received' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
