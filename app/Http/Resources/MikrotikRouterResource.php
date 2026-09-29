<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MikrotikRouterResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'host'       => $this->host,
            'api_port'   => $this->api_port,
            'username'   => $this->username,
            'password'   => $this->password, // decrypted — only used by collector
            'is_active'  => $this->is_active,
            'notes'      => $this->notes,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
