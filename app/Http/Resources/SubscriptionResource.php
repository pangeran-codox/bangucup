<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'customer_id'       => $this->customer_id,
            'package_id'        => $this->package_id,
            'odp_id'            => $this->odp_id,
            'mikrotik_router_id'=> $this->mikrotik_router_id,
            'port_number'       => $this->port_number,
            'pppoe_username'    => $this->pppoe_username,
            'billing_due_date'  => $this->billing_due_date,
            'status'            => $this->status,
            'started_at'        => $this->started_at,
            'ended_at'          => $this->ended_at,
            'created_at'        => $this->created_at,
            'updated_at'        => $this->updated_at,
            'customer'          => new CustomerResource($this->whenLoaded('customer')),
            'package'           => new PackageResource($this->whenLoaded('package')),
        ];
    }
}
