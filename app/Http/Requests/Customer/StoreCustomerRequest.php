<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'           => ['required', 'string', 'max:150'],
            'phone'          => ['required', 'string', 'max:20'],
            'email'          => ['nullable', 'email', 'max:150'],
            'address'        => ['required', 'string'],
            'coordinate_lat' => ['nullable', 'numeric'],
            'coordinate_lng' => ['nullable', 'numeric'],
            'status'         => ['nullable', Rule::in(['active', 'isolir', 'inactive', 'pending'])],
            'joined_at'      => ['nullable', 'date'],
        ];
    }
}
