<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Invoice\StoreInvoiceRequest;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            ->paginate($request->integer('per_page', 20));

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
        $invoice = Invoice::create($request->validated());
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
        $invoice->update($request->only([
            'voucher_id', 'amount', 'discount_amount', 'due_date', 'status',
        ]));

        return $this->success(new InvoiceResource($invoice), 'Invoice berhasil diperbarui');
    }

    public function destroy(Invoice $invoice): JsonResponse
    {
        $invoice->delete();

        return $this->noContent();
    }

    public function markPaid(Invoice $invoice): JsonResponse
    {
        if ($invoice->status === 'paid') {
            return $this->error('Invoice sudah berstatus paid.', 422);
        }

        $invoice->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        $restored = $this->billing->restoreIfSettled($invoice);

        return $this->success(
            new InvoiceResource($invoice),
            $restored ? 'Invoice ditandai lunas, langganan dipulihkan' : 'Invoice ditandai lunas'
        );
    }
}
