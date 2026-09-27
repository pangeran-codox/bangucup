<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CableRouteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'odp_id'      => $this->odp_id,
            'odp'         => new OdpResource($this->whenLoaded('odp')),
            'customer_id' => $this->customer_id,
            'customer'    => new CustomerResource($this->whenLoaded('customer')),
            'path'        => $this->path,
            'status'      => $this->status,
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
        ];
    }
}
