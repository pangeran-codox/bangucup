<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class IsolirLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'subscription_id' => $this->subscription_id,
            'subscription'    => new SubscriptionResource($this->whenLoaded('subscription')),
            'action'          => $this->action,
            'reason'          => $this->reason,
            'triggered_by'    => $this->triggered_by,
            'admin_id'        => $this->admin_id,
            'admin'           => new UserResource($this->whenLoaded('admin')),
            'created_at'      => $this->created_at,
        ];
    }
}
