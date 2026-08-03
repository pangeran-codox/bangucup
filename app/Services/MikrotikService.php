<?php

namespace App\Services;

use App\Models\MikrotikRouter;
use Illuminate\Support\Facades\Log;
use RouterOS\Client;
use RouterOS\Config;
use RouterOS\Query;

class MikrotikService
{
    protected function client(MikrotikRouter $router): Client
    {
        $config = (new Config())
            ->set('host', $router->host)
            ->set('user', $router->username)
            ->set('pass', $router->password)
            ->set('port', (int) $router->api_port)
            ->set('timeout', (int) config('mikrotik.timeout', 5));

        return new Client($config);
    }

    public function setProfile(MikrotikRouter $router, string $pppoeUsername, string $profileName): bool
    {
        try {
            $client = $this->client($router);

            $query = (new Query('/ppp/secret/print'))->where('name', $pppoeUsername);
            $secrets = $client->query($query)->read();

            if (empty($secrets)) {
                Log::warning("Mikrotik ({$router->name}): PPP secret '{$pppoeUsername}' tidak ditemukan.");

                return false;
            }

            $setQuery = (new Query('/ppp/secret/set'))
                ->equal('.id', $secrets[0]['.id'])
                ->equal('profile', $profileName);

            $client->query($setQuery)->read();

            $this->kickActiveConnection($client, $pppoeUsername);

            return true;
        } catch (\Throwable $e) {
            Log::error("Mikrotik ({$router->name}): gagal ganti profile '{$pppoeUsername}' ke '{$profileName}'", [
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    protected function kickActiveConnection(Client $client, string $pppoeUsername): void
    {
        $query = (new Query('/ppp/active/print'))->where('name', $pppoeUsername);
        $active = $client->query($query)->read();

        if (! empty($active)) {
            $removeQuery = (new Query('/ppp/active/remove'))->equal('.id', $active[0]['.id']);
            $client->query($removeQuery)->read();
        }
    }

    public function isolir(MikrotikRouter $router, string $pppoeUsername): bool
    {
        return $this->setProfile($router, $pppoeUsername, config('mikrotik.isolir_profile', 'isolir'));
    }

    public function restore(MikrotikRouter $router, string $pppoeUsername, string $originalProfile): bool
    {
        return $this->setProfile($router, $pppoeUsername, $originalProfile);
    }

    /**
     * Dipakai tombol "Test Koneksi" di halaman edit router.
     */
    public function testConnection(MikrotikRouter $router): bool
    {
        try {
            $client = $this->client($router);
            $client->query('/system/identity/print')->read();

            return true;
        } catch (\Throwable $e) {
            Log::warning("Mikrotik ({$router->name}): test koneksi gagal", ['error' => $e->getMessage()]);

            return false;
        }
    }
}