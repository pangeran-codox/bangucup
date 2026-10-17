<?php

namespace App\Http\Controllers\Api;

use App\Support\WsTicket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RealtimeController extends ApiController
{
    /** Terbitkan tiket WebSocket (berlaku 60 detik, hanya bisa dipakai sekali). */
    public function ticket(Request $request): JsonResponse
    {
        $secret = (string) config('services.realtime.ticket_secret');

        if (strlen($secret) < 32) {
            return $this->error('WS_TICKET_SECRET belum diatur (minimal 32 karakter).', 503);
        }

        $ttl = (int) config('services.realtime.ticket_ttl', 60);

        return $this->success([
            'ticket'     => WsTicket::make($request->user()->id, $secret, $ttl),
            'expires_in' => $ttl,
        ]);
    }
}
