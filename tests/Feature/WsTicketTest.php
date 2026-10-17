<?php

namespace Tests\Feature;

use Tests\ApiTestCase;

class WsTicketTest extends ApiTestCase
{
    public function test_tanpa_login_ditolak(): void
    {
        $this->postJson('/api/realtime/ticket')->assertUnauthorized();
    }

    public function test_staff_tanpa_izin_monitoring_ditolak(): void
    {
        $this->asRole('staff');

        $this->postJson('/api/realtime/ticket')->assertForbidden();
    }

    public function test_teknisi_mendapat_tiket_bertanda_tangan_valid(): void
    {
        $teknisi = $this->asRole('teknisi');

        $ticket = $this->postJson('/api/realtime/ticket')
            ->assertOk()
            ->json('data.ticket');

        [$payload, $signature] = explode('.', $ticket);

        $secret = config('services.realtime.ticket_secret');
        $this->assertSame(hash_hmac('sha256', $payload, $secret), $signature);

        $claims = json_decode(base64_decode(strtr($payload, '-_', '+/')), true);
        $this->assertSame($teknisi->id, $claims['uid']);
        $this->assertNotEmpty($claims['jti']);
        $this->assertEqualsWithDelta(time() + 60, $claims['exp'], 5);
    }

    public function test_tiap_tiket_unik(): void
    {
        $this->asRole('teknisi');

        $a = $this->postJson('/api/realtime/ticket')->json('data.ticket');
        $b = $this->postJson('/api/realtime/ticket')->json('data.ticket');

        $this->assertNotSame($a, $b);
    }

    public function test_secret_lemah_ditolak_dengan_503(): void
    {
        config(['services.realtime.ticket_secret' => 'terlalu-pendek']);
        $this->asRole('teknisi');

        $this->postJson('/api/realtime/ticket')->assertStatus(503);
    }
}
