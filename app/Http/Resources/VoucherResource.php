<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class VoucherResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'code'        => $this->code,
            'type'        => $this->type,
            'value'       => (float) $this->value,
            'applies_to'  => $this->applies_to,
            'valid_from'  => $this->valid_from,
            'valid_until' => $this->valid_until,
            'max_usage'   => $this->max_usage,
            'used_count'  => $this->used_count,
            'created_at'  => $this->created_at,
        ];
    }
}
