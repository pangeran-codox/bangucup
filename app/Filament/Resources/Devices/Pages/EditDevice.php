<?php

namespace App\Filament\Resources\Devices\Pages;

use App\Filament\Resources\Devices\DeviceResource;
use App\Services\GenieAcsService;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditDevice extends EditRecord
{
    protected static string $resource = DeviceResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('syncGenieAcs')
                ->label('Sync dari GenieACS')
                ->icon('heroicon-o-arrow-path')
                ->color('gray')
                ->visible(fn () => filled($this->record->genieacs_device_id))
                ->action(function (GenieAcsService $genieAcs) {
                    $raw = $genieAcs->getDevice($this->record->genieacs_device_id);

                    if (! $raw) {
                        Notification::make()
                            ->title('Device tidak ditemukan di GenieACS')
                            ->body('Cek lagi ID device-nya, atau device belum pernah connect ke GenieACS.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $summary = $genieAcs->extractSummary($raw);

                    $thresholdMinutes = (int) config('genieacs.online_threshold_minutes', 15);

                    $status = 'unknown';
                    if ($summary['last_inform_at']) {
                        $status = $summary['last_inform_at']->diffInMinutes(now()) <= $thresholdMinutes
                            ? 'online'
                            : 'offline';
                    }

                    $this->record->update([
                        'serial_number' => $summary['serial_number'] ?? $this->record->serial_number,
                        'brand_model' => $summary['brand_model'] ?? $this->record->brand_model,
                        'rx_power' => $summary['rx_power'],
                        'ssid' => $summary['ssid'] ?? $this->record->ssid,
                        'last_inform_at' => $summary['last_inform_at'],
                        'last_status' => $status,
                    ]);

                    $this->fillForm();

                    Notification::make()
                        ->title('Sync berhasil')
                        ->body("Status device sekarang: {$status}")
                        ->success()
                        ->send();
                }),

            DeleteAction::make(),
        ];
    }
}