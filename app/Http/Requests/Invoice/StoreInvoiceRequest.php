<?php

namespace App\Http\Requests\Invoice;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInvoiceRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id'     => ['required', 'exists:customers,id'],
            'subscription_id' => ['required', 'exists:subscriptions,id'],
            'voucher_id'      => ['nullable', 'exists:vouchers,id'],
            'type'            => ['required', Rule::in(['installation', 'monthly', 'other'])],
            'period_month'    => ['nullable', 'date_format:Y-m'],
            'amount'          => ['required', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'due_date'        => ['required', 'date'],
        ];
    }
}
