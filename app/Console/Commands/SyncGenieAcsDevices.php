<?php

namespace App\Console\Commands;

use App\Models\Device;
use App\Services\GenieAcsService;
use Illuminate\Console\Command;

class SyncGenieAcsDevices extends Command
{
    protected $signature = 'genieacs:sync-devices';

    protected $description = 'Sinkronkan status device dari GenieACS ke tabel devices (cache lokal)';

    public function handle(GenieAcsService $genieAcs): int
    {
        $devices = Device::query()->whereNotNull('genieacs_device_id')->get();

        if ($devices->isEmpty()) {
            $this->info('Belum ada device dengan genieacs_device_id terisi. Lewati sync.');

            return self::SUCCESS;
        }

        $thresholdMinutes = (int) config('genieacs.online_threshold_minutes', 15);

        foreach ($devices as $device) {
            $raw = $genieAcs->getDevice($device->genieacs_device_id);

            if (! $raw) {
                $device->update(['last_status' => 'unknown']);
                $this->warn("Device {$device->genieacs_device_id} tidak ditemukan di GenieACS.");

                continue;
            }

            $summary = $genieAcs->extractSummary($raw);

            $status = 'unknown';
            if ($summary['last_inform_at']) {
                $status = $summary['last_inform_at']->diffInMinutes(now()) <= $thresholdMinutes
                    ? 'online'
                    : 'offline';
            }

            $device->update([
                'serial_number' => $summary['serial_number'] ?? $device->serial_number,
                'brand_model' => $summary['brand_model'] ?? $device->brand_model,
                'rx_power' => $summary['rx_power'],
                'ssid' => $summary['ssid'] ?? $device->ssid,
                'last_inform_at' => $summary['last_inform_at'],
                'last_status' => $status,
            ]);

            $this->info("Sync sukses: {$device->genieacs_device_id} -> {$status}");
        }

        return self::SUCCESS;
    }
}