<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'customer_id'     => $this->customer_id,
            'subscription_id' => $this->subscription_id,
            'subject'         => $this->subject,
            'description'     => $this->description,
            'status'          => $this->status,
            'priority'        => $this->priority,
            'assigned_to'     => $this->assigned_to,
            'resolved_at'     => $this->resolved_at,
            'created_at'      => $this->created_at,
            'customer'        => new CustomerResource($this->whenLoaded('customer')),
            'replies'         => TicketReplyResource::collection($this->whenLoaded('replies')),
        ];
    }
}
