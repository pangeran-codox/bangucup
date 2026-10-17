<?php

namespace App\Http\Requests\Invoice;

use App\Models\Invoice;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

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
            'period_month'    => ['nullable', 'date_format:Y-m-d'],
            'amount'          => ['required', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'due_date'        => ['required', 'date'],
        ];
    }

    /** Kolom period_month bertipe date: "2026-10" dinormalkan jadi "2026-10-01". */
    protected function prepareForValidation(): void
    {
        $period = $this->input('period_month');

        if (is_string($period) && preg_match('/^\d{4}-\d{2}$/', $period)) {
            $this->merge(['period_month' => $period.'-01']);
        }
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            if ($v->errors()->isNotEmpty()) {
                return;
            }

            if ((float) $this->input('discount_amount', 0) > (float) $this->input('amount')) {
                $v->errors()->add('discount_amount', 'Diskon tidak boleh lebih besar dari nominal tagihan.');
            }

            if ($this->input('type') === 'monthly' && $this->filled('period_month')) {
                $exists = Invoice::where('subscription_id', $this->input('subscription_id'))
                    ->where('type', 'monthly')
                    ->whereDate('period_month', $this->input('period_month'))
                    ->exists();

                if ($exists) {
                    $v->errors()->add('period_month', 'Invoice bulanan untuk periode ini sudah ada.');
                }
            }
        });
    }
}
