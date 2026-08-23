<?php

namespace App\Http\Requests\Package;

use Illuminate\Foundation\Http\FormRequest;

class StorePackageRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'                  => ['required', 'string', 'max:100'],
            'speed_mbps'            => ['required', 'integer', 'min:1'],
            'price'                 => ['required', 'numeric', 'min:0'],
            'mikrotik_profile_name' => ['required', 'string', 'max:100'],
            'is_active'             => ['nullable', 'boolean'],
        ];
    }
}
