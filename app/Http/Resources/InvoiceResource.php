<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'invoice_number'  => $this->invoice_number,
            'customer_id'     => $this->customer_id,
            'subscription_id' => $this->subscription_id,
            'voucher_id'      => $this->voucher_id,
            'type'            => $this->type,
            'period_month'    => $this->period_month,
            'amount'          => (float) $this->amount,
            'discount_amount' => (float) $this->discount_amount,
            'final_amount'    => (float) $this->final_amount,
            'due_date'        => $this->due_date,
            'status'          => $this->status,
            'paid_at'         => $this->paid_at,
            'created_at'      => $this->created_at,
            'updated_at'      => $this->updated_at,
            'customer'        => new CustomerResource($this->whenLoaded('customer')),
            'payments'        => PaymentResource::collection($this->whenLoaded('payments')),
        ];
    }
}
