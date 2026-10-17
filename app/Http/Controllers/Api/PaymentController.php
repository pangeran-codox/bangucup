<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\PaymentResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class PaymentController extends ApiController
{
    public function __construct(private readonly BillingService $billing) {}

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
            ->paginate(min($request->integer('per_page', 20), 100));

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

    /**
     * Catat pembayaran MANUAL (tunai/transfer).
     *
     * Pembayaran dari payment gateway (midtrans/xendit) tidak boleh masuk lewat sini;
     * itu harus lewat webhook yang memverifikasi signature.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id'             => ['required', 'integer', 'exists:invoices,id'],
            'gateway'                => ['required', Rule::in(['manual', 'other'])],
            'gateway_transaction_id' => ['nullable', 'string', 'max:150', 'unique:payments,gateway_transaction_id'],
            'method'                 => ['nullable', 'string', 'max:50'],
            'amount'                 => ['required', 'numeric', 'min:0.01'],
            'status'                 => ['nullable', Rule::in(['pending', 'success', 'failed', 'expired'])],
            'paid_at'                => ['nullable', 'date', 'before_or_equal:now'],
        ]);

        $status = $data['status'] ?? 'pending';

        [$payment, $invoice] = DB::transaction(function () use ($data, $status, $request) {
            // Kunci baris invoice supaya dua pembayaran bersamaan tidak lolos bersamaan.
            $invoice = Invoice::lockForUpdate()->findOrFail($data['invoice_id']);

            if (! in_array($invoice->status, ['unpaid', 'overdue'], true)) {
                throw ValidationException::withMessages([
                    'invoice_id' => "Invoice berstatus {$invoice->status}, tidak bisa dibayar.",
                ]);
            }

            if ($status === 'success') {
                if (round((float) $data['amount'], 2) < round($invoice->final_amount, 2)) {
                    throw ValidationException::withMessages([
                        'amount' => 'Nominal kurang dari total tagihan.',
                    ]);
                }

                if ($invoice->payments()->where('status', 'success')->exists()) {
                    throw ValidationException::withMessages([
                        'invoice_id' => 'Invoice ini sudah punya pembayaran sukses.',
                    ]);
                }
            }

            $payment = Payment::create([
                'invoice_id'             => $invoice->id,
                'gateway'                => $data['gateway'],
                'gateway_transaction_id' => $data['gateway_transaction_id'] ?? null,
                'method'                 => $data['method'] ?? null,
                'amount'                 => $data['amount'],
                'status'                 => $status,
                'paid_at'                => $status === 'success' ? ($data['paid_at'] ?? now()) : null,
                'raw_payload'            => ['source' => 'manual', 'recorded_by' => $request->user()->id],
            ]);

            if ($status === 'success') {
                $invoice->update(['status' => 'paid', 'paid_at' => $payment->paid_at]);
            }

            return [$payment, $invoice];
        });

        // Panggil MikroTik SETELAH transaksi selesai, supaya lock database tidak
        // tertahan menunggu router.
        if ($status === 'success') {
            $this->billing->restoreIfSettled($invoice);
        }

        return $this->created(new PaymentResource($payment), 'Pembayaran berhasil dicatat');
    }
}
