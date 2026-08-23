<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Ticket\StoreTicketRequest;
use App\Http\Resources\TicketReplyResource;
use App\Http\Resources\TicketResource;
use App\Models\Ticket;
use App\Models\TicketReply;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Ticket::with('customer');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }

        if ($request->filled('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        $tickets = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => TicketResource::collection($tickets),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page'    => $tickets->lastPage(),
                'per_page'     => $tickets->perPage(),
                'total'        => $tickets->total(),
            ],
        ]);
    }

    public function store(StoreTicketRequest $request): JsonResponse
    {
        $ticket = Ticket::create($request->validated());
        $ticket->load('customer');

        return $this->created(new TicketResource($ticket), 'Tiket berhasil dibuat');
    }

    public function show(Ticket $ticket): JsonResponse
    {
        $ticket->load(['customer', 'replies.user']);

        return $this->success(new TicketResource($ticket));
    }

    public function update(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'status'      => ['sometimes', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'priority'    => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'resolved_at' => ['nullable', 'date'],
        ]);

        $ticket->update($data);

        return $this->success(new TicketResource($ticket), 'Tiket berhasil diperbarui');
    }

    public function destroy(Ticket $ticket): JsonResponse
    {
        $ticket->delete();

        return $this->noContent();
    }

    public function reply(Request $request, Ticket $ticket): JsonResponse
    {
        $data = $request->validate([
            'message' => ['required', 'string'],
        ]);

        $reply = TicketReply::create([
            'ticket_id' => $ticket->id,
            'user_id'   => $request->user()->id,
            'message'   => $data['message'],
        ]);

        $reply->load('user');

        // Auto update status jadi in_progress kalau masih open
        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        return $this->created(new TicketReplyResource($reply), 'Balasan berhasil dikirim');
    }
}
