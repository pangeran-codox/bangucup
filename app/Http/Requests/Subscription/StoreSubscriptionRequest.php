<?php

namespace App\Http\Requests\Subscription;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriptionRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id'        => ['required', 'exists:customers,id'],
            'package_id'         => ['required', 'exists:packages,id'],
            'odp_id'             => ['nullable', 'exists:odps,id'],
            'mikrotik_router_id' => ['nullable', 'exists:mikrotik_routers,id'],
            'port_number'        => ['nullable', 'integer', 'min:1'],
            'pppoe_username'     => ['required', 'string', 'max:100', 'unique:subscriptions,pppoe_username'],
            'pppoe_password'     => ['required', 'string', 'max:255'],
            'billing_due_date'   => ['nullable', 'integer', 'min:1', 'max:31'],
            'started_at'         => ['nullable', 'date'],
        ];
    }
}
