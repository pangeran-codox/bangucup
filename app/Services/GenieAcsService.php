<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenieAcsService
{
    protected string $baseUrl;

    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim((string) config('genieacs.base_url'), '/');
        $this->timeout = (int) config('genieacs.timeout', 10);
    }

    protected function client(): PendingRequest
    {
        $http = Http::baseUrl($this->baseUrl)->timeout($this->timeout);

        if (config('genieacs.auth.username')) {
            $http = $http->withBasicAuth(
                config('genieacs.auth.username'),
                config('genieacs.auth.password'),
            );
        }

        return $http;
    }

    /**
     * Ambil semua device dari GenieACS (raw, belum di-parse).
     */
    public function getDevices(): array
    {
        $response = $this->client()->get('/devices');

        if ($response->failed()) {
            Log::warning('GenieACS: gagal ambil daftar device', ['status' => $response->status()]);

            return [];
        }

        return $response->json() ?? [];
    }

    /**
     * Ambil 1 device by genieacs_device_id (raw, belum di-parse).
     */
    public function getDevice(string $deviceId): ?array
    {
        $response = $this->client()->get('/devices', [
            'query' => json_encode(['_id' => $deviceId]),
        ]);

        if ($response->failed()) {
            Log::warning("GenieACS: gagal ambil device {$deviceId}", ['status' => $response->status()]);

            return null;
        }

        $devices = $response->json() ?? [];

        return $devices[0] ?? null;
    }

    /**
     * Trigger CPE buat refresh parameter (connection request TR-069).
     */
    public function refreshDevice(string $deviceId): bool
    {
        $response = $this->client()
            ->withQueryParameters(['connection_request' => ''])
            ->post("/devices/{$deviceId}/tasks", [
                'name' => 'refreshObject',
                'objectName' => '',
            ]);

        if ($response->failed()) {
            Log::warning("GenieACS: gagal trigger refresh device {$deviceId}", ['status' => $response->status()]);
        }

        return $response->successful();
    }

    /**
     * Parse data mentah GenieACS jadi array siap simpan ke tabel `devices`.
     */
    public function extractSummary(array $rawDevice): array
    {
        $paths = config('genieacs.parameter_paths');

        $lastInform = $rawDevice['_lastInform'] ?? null;

        // Serial number & merk/model ada di object `_deviceId` (level atas,
        // hasil parsing struktur CWMP DeviceId), BUKAN di dalam parameter
        // tree InternetGatewayDevice. Lebih reliable dipakai daripada path
        // config, karena _deviceId selalu ada di semua device TR-069.
        $deviceId = $rawDevice['_deviceId'] ?? [];
        $manufacturer = $deviceId['_Manufacturer'] ?? null;
        $productClass = $deviceId['_ProductClass'] ?? null;

        return [
            'serial_number' => $deviceId['_SerialNumber']
                ?? $this->extractValue($rawDevice, $paths['serial_number']),
            'brand_model' => ($manufacturer && $productClass)
                ? "{$manufacturer} {$productClass}"
                : $this->extractValue($rawDevice, $paths['brand_model']),
            'rx_power' => $this->extractValue($rawDevice, $paths['rx_power']),
            'ssid' => $this->extractValue($rawDevice, $paths['ssid']),
            'last_inform_at' => $lastInform ? Carbon::parse($lastInform) : null,
        ];
    }

    /**
     * Baca nilai dari struktur bertingkat TR-069, misal path
     * "InternetGatewayDevice.DeviceInfo.SerialNumber" jadi
     * $raw['InternetGatewayDevice']['DeviceInfo']['SerialNumber']['_value'].
     */
    protected function extractValue(array $rawDevice, string $path): ?string
    {
        $segments = explode('.', $path);
        $current = $rawDevice;

        foreach ($segments as $segment) {
            if (! is_array($current) || ! isset($current[$segment])) {
                return null;
            }

            $current = $current[$segment];
        }

        return $current['_value'] ?? null;
    }
}