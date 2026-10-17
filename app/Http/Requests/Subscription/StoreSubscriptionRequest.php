<?php

namespace App\Http\Requests\Subscription;

use App\Models\Odp;
use App\Models\Subscription;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

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

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $odpId = $this->integer('odp_id');
            $port  = $this->integer('port_number');

            if (! $odpId || ! $port || $v->errors()->has('port_number')) {
                return;
            }

            $odp = Odp::find($odpId);

            if ($odp && $port > $odp->total_ports) {
                $v->errors()->add('port_number', "Port melebihi kapasitas ODP ({$odp->total_ports} port).");
            } elseif (Subscription::portTaken($odpId, $port)) {
                $v->errors()->add('port_number', 'Port ODP ini sudah dipakai langganan lain.');
            }
        });
    }
}
