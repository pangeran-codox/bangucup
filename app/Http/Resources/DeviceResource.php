<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                  => $this->id,
            'customer_id'         => $this->customer_id,
            'genieacs_device_id'  => $this->genieacs_device_id,
            'serial_number'       => $this->serial_number,
            'brand_model'         => $this->brand_model,
            'last_inform_at'      => $this->last_inform_at,
            'last_status'         => $this->last_status,
            'rx_power'            => $this->rx_power,
            'ssid'                => $this->ssid,
            'updated_at'          => $this->updated_at,
            'customer'            => new CustomerResource($this->whenLoaded('customer')),
        ];
    }
}
