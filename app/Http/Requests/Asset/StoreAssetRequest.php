<?php

namespace App\Http\Requests\Asset;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssetRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'      => ['required', 'string', 'max:150'],
            'category'  => ['required', 'string', 'max:50'],
            'sku'       => ['nullable', 'string', 'max:50'],
            'stock_qty' => ['nullable', 'integer'],
            'unit'      => ['nullable', 'string', 'max:20'],
        ];
    }
}

