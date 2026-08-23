<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'name'           => $this->name,
            'phone'          => $this->phone,
            'email'          => $this->email,
            'address'        => $this->address,
            'coordinate_lat' => $this->coordinate_lat,
            'coordinate_lng' => $this->coordinate_lng,
            'status'         => $this->status,
            'joined_at'      => $this->joined_at,
            'created_at'     => $this->created_at,
            'updated_at'     => $this->updated_at,
            // Relasi — hanya dimuat kalau di-load
            'subscriptions'  => SubscriptionResource::collection($this->whenLoaded('subscriptions')),
        ];
    }
}
