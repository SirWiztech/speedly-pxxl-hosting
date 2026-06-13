<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatMessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $rideId;
    public $message;

    public function __construct(string $rideId, array $message)
    {
        $this->rideId = $rideId;
        $this->message = $message;
    }

    public function broadcastOn(): array
    {
        return [new Channel('chat.' . $this->rideId)];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
