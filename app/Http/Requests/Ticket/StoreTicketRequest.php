<?php

namespace App\Http\Requests\Ticket;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'customer_id'     => ['required', 'exists:customers,id'],
            'subscription_id' => ['nullable', 'exists:subscriptions,id'],
            'subject'         => ['required', 'string', 'max:200'],
            'description'     => ['nullable', 'string'],
            'priority'        => ['nullable', Rule::in(['low', 'medium', 'high'])],
            'assigned_to'     => ['nullable', 'exists:users,id'],
        ];
    }
}
