<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PackageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'name'                 => $this->name,
            'speed_mbps'           => $this->speed_mbps,
            'price'                => (float) $this->price,
            'mikrotik_profile_name'=> $this->mikrotik_profile_name,
            'is_active'            => $this->is_active,
            'created_at'           => $this->created_at,
            'updated_at'           => $this->updated_at,
        ];
    }
}
