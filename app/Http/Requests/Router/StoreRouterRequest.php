<?php

namespace App\Http\Requests\Router;

use Illuminate\Foundation\Http\FormRequest;

class StoreRouterRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:100'],
            'host'      => ['required', 'string', 'max:100'],
            'api_port'  => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username'  => ['required', 'string', 'max:100'],
            // Wajib saat membuat router; saat edit boleh dikosongkan (password lama dipertahankan).
            'password'  => [$this->isMethod('POST') ? 'required' : 'nullable', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
            'notes'     => ['nullable', 'string', 'max:255'],
        ];
    }
}
