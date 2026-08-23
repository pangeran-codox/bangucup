<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OdpResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'name'                => $this->name,
            'location_lat'        => $this->location_lat,
            'location_lng'        => $this->location_lng,
            'total_ports'         => $this->total_ports,
            'used_ports'          => $this->used_ports_count ?? $this->usedPortsCount(),
            'available_ports'     => $this->available_ports ?? $this->availablePortsCount(),
            'installed_at'        => $this->installed_at,
            'created_at'          => $this->created_at,
        ];
    }
}
