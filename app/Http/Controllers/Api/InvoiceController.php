<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\Payment;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class InvoiceController extends ApiController
{
    public function __construct(private readonly BillingService $billing) {}

    public function index(Request $request): JsonResponse
    {
        $query = Invoice::with('customer');

        if ($request->filled('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('from')) {
            $query->whereDate('due_date', '>=', $request->from);
        }

        if ($request->filled('to')) {
            $query->whereDate('due_date', '<=', $request->to);
        }

        $invoices = $query
            ->orderByDesc('created_at')
            ->paginate(min($request->integer('per_page', 20), 100));

        return $this->success([
            'data' => InvoiceResource::collection($invoices),
            'meta' => [
                'current_page' => $invoices->currentPage(),
                'last_page'    => $invoices->lastPage(),
                'per_page'     => $invoices->perPage(),
                'total'        => $invoices->total(),
            ],
        ]);
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['discount_amount'] = $data['discount_amount'] ?? 0;

        $invoice = Invoice::create($data);
        $invoice->load('customer');

        return $this->created(new InvoiceResource($invoice), 'Invoice berhasil dibuat');
    }

    public function show(Invoice $invoice): JsonResponse
    {
        $invoice->load(['customer', 'payments', 'subscription.package']);

        return $this->success(new InvoiceResource($invoice));
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return $this->error('Invoice yang sudah lunas tidak dapat diubah.', 422);
        }

        // Status "paid" sengaja tidak boleh diset di sini; pakai endpoint mark-paid
        // supaya pembayaran tercatat dan langganan dipulihkan.
        $data = $request->validate([
            'voucher_id'      => ['nullable', 'exists:vouchers,id'],
            'amount'          => ['sometimes', 'numeric', 'min:0'],
            'discount_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'due_date'        => ['sometimes', 'date'],
            'status'          => ['sometimes', Rule::in(['unpaid', 'overdue', 'cancelled'])],
        ]);

        $amount   = (float) ($data['amount'] ?? $invoice->amount);
        $discount = (float) ($data['discount_amount'] ?? $invoice->discount_amount ?? 0);

        if ($discount > $amount) {
            throw ValidationException::withMessages([
                'discount_amount' => 'Diskon tidak boleh lebih besar dari nominal tagihan.',
            ]);
        }

        if (array_key_exists('discount_amount', $data) && $data['discount_amount'] === null) {
            $data['discount_amount'] = 0; // kolom NOT NULL
        }

        $invoice->update($data);

        return $this->success(new InvoiceResource($invoice), 'Invoice berhasil diperbarui');
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        // Invoice lunas adalah catatan keuangan; batalkan (cancelled) saja, jangan dihapus.
        if ($invoice->status === 'paid' || $invoice->payments()->exists()) {
            return $this->error('Invoice yang sudah punya pembayaran tidak dapat dihapus.', 422);
        }

        $invoice->delete();

        return $this->noContent();
    }

    public function markPaid(Request $request, Invoice $invoice): JsonResponse
    {
        $invoice = DB::transaction(function () use ($invoice, $request) {
            $locked = Invoice::lockForUpdate()->findOrFail($invoice->id);

            if ($locked->status === 'paid') {
                throw ValidationException::withMessages(['invoice' => 'Invoice sudah berstatus paid.']);
            }

            if ($locked->status === 'cancelled') {
                throw ValidationException::withMessages(['invoice' => 'Invoice yang dibatalkan tidak dapat dilunasi.']);
            }

            // Catat sebagai pembayaran manual agar riwayat keuangan tetap lengkap.
            $payment = Payment::create([
                'invoice_id'  => $locked->id,
                'gateway'     => 'manual',
                'method'      => 'manual',
                'amount'      => $locked->final_amount,
                'status'      => 'success',
                'paid_at'     => now(),
                'raw_payload' => ['source' => 'mark-paid', 'recorded_by' => $request->user()->id],
            ]);

            $locked->update(['status' => 'paid', 'paid_at' => $payment->paid_at]);

            return $locked;
        });

        // Panggil MikroTik setelah transaksi selesai.
        $restored = $this->billing->restoreIfSettled($invoice);

        return $this->success(
            new InvoiceResource($invoice),
            $restored ? 'Invoice ditandai lunas, langganan dipulihkan' : 'Invoice ditandai lunas'
        );
    }
}
