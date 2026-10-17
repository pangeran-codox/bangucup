<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Tiket berumur pendek untuk membuka koneksi WebSocket ke realtime-gateway.
 *
 * Format:  base64url(JSON{uid,exp,jti}) . hex(HMAC-SHA256(secret, base64url(...)))
 * Gateway Go memverifikasi tanda tangan memakai secret yang sama (WS_TICKET_SECRET),
 * dan menolak jti yang sudah pernah dipakai, jadi tiket hanya berlaku sekali.
 */
class WsTicket
{
    public static function make(int $userId, string $secret, int $ttlSeconds = 60): string
    {
        $payload = rtrim(strtr(base64_encode(json_encode([
            'uid' => $userId,
            'exp' => time() + $ttlSeconds,
            'jti' => Str::random(24),
        ], JSON_THROW_ON_ERROR)), '+/', '-_'), '=');

        return $payload.'.'.hash_hmac('sha256', $payload, $secret);
    }
}
