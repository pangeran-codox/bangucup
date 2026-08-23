<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                     => $this->id,
            'invoice_id'             => $this->invoice_id,
            'gateway'                => $this->gateway,
            'gateway_transaction_id' => $this->gateway_transaction_id,
            'method'                 => $this->method,
            'amount'                 => (float) $this->amount,
            'status'                 => $this->status,
            'paid_at'                => $this->paid_at,
            'created_at'             => $this->created_at,
            'invoice'                => new InvoiceResource($this->whenLoaded('invoice')),
        ];
    }
}
