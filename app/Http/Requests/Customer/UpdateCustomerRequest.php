<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCustomerRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'           => ['sometimes', 'string', 'max:150'],
            'phone'          => ['sometimes', 'string', 'max:20'],
            'email'          => ['nullable', 'email', 'max:150'],
            'address'        => ['sometimes', 'string'],
            'coordinate_lat' => ['nullable', 'numeric'],
            'coordinate_lng' => ['nullable', 'numeric'],
            'status'         => ['sometimes', Rule::in(['active', 'isolir', 'inactive', 'pending'])],
            'joined_at'      => ['nullable', 'date'],
        ];
    }
}
