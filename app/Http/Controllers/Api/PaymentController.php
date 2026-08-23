<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Payment::with('invoice.customer');

        if ($request->filled('invoice_id')) {
            $query->where('invoice_id', $request->invoice_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $payments = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => PaymentResource::collection($payments),
            'meta' => [
                'current_page' => $payments->currentPage(),
                'last_page'    => $payments->lastPage(),
                'per_page'     => $payments->perPage(),
                'total'        => $payments->total(),
            ],
        ]);
    }

    public function show(Payment $payment): JsonResponse
    {
        $payment->load('invoice.customer');

        return $this->success(new PaymentResource($payment));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'gateway'    => ['required', Rule::in(['midtrans', 'xendit', 'manual', 'other'])],
            'method'     => ['nullable', 'string', 'max:50'],
            'amount'     => ['required', 'numeric', 'min:0'],
            'status'     => ['nullable', Rule::in(['pending', 'success', 'failed', 'expired'])],
            'paid_at'    => ['nullable', 'datetime'],
        ]);

        $payment = Payment::create($data);

        // Jika sukses, update status invoice
        if (($data['status'] ?? 'pending') === 'success') {
            $invoice = Invoice::find($data['invoice_id']);
            $invoice?->update(['status' => 'paid', 'paid_at' => $data['paid_at'] ?? now()]);
        }

        return $this->created(new PaymentResource($payment), 'Pembayaran berhasil dicatat');
    }
}
