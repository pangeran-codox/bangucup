<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\VoucherResource;
use App\Models\Voucher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VoucherController extends ApiController
{
    public function index(): JsonResponse
    {
        $vouchers = Voucher::orderByDesc('created_at')->get();

        return $this->success(VoucherResource::collection($vouchers));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'        => ['required', 'string', 'max:50', 'unique:vouchers,code'],
            'type'        => ['required', Rule::in(['percentage', 'fixed'])],
            'value'       => ['required', 'numeric', 'min:0'],
            'applies_to'  => ['required', Rule::in(['installation', 'monthly', 'all'])],
            'valid_from'  => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'max_usage'   => ['nullable', 'integer', 'min:1'],
        ]);

        $voucher = Voucher::create($data);

        return $this->created(new VoucherResource($voucher), 'Voucher berhasil dibuat');
    }

    public function show(Voucher $voucher): JsonResponse
    {
        return $this->success(new VoucherResource($voucher));
    }

    public function update(Request $request, Voucher $voucher): JsonResponse
    {
        $data = $request->validate([
            'type'        => ['sometimes', Rule::in(['percentage', 'fixed'])],
            'value'       => ['sometimes', 'numeric', 'min:0'],
            'applies_to'  => ['sometimes', Rule::in(['installation', 'monthly', 'all'])],
            'valid_from'  => ['nullable', 'date'],
            'valid_until' => ['nullable', 'date'],
            'max_usage'   => ['nullable', 'integer', 'min:1'],
        ]);

        $voucher->update($data);

        return $this->success(new VoucherResource($voucher), 'Voucher berhasil diperbarui');
    }

    public function destroy(Voucher $voucher): JsonResponse
    {
        $voucher->delete();

        return $this->noContent();
    }
}
