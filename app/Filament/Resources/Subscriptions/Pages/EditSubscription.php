<?php

namespace App\Filament\Resources\Subscriptions\Pages;

use App\Filament\Resources\Subscriptions\SubscriptionResource;
use App\Models\IsolirLog;
use App\Services\MikrotikService;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditSubscription extends EditRecord
{
    protected static string $resource = SubscriptionResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('isolir')
                ->label('Isolir')
                ->icon('heroicon-o-no-symbol')
                ->color('danger')
                ->visible(fn () => $this->record->status !== 'isolir')
                ->requiresConfirmation()
                ->modalDescription('Pelanggan akan diisolir (internet dibatasi lewat Mikrotik). Lanjutkan?')
                ->action(function (MikrotikService $mikrotik) {
                    $router = $this->record->mikrotikRouter;

                    if (! $router) {
                        Notification::make()
                            ->title('Router belum dipilih')
                            ->body('Pilih Router Mikrotik dulu di form subscription ini sebelum isolir.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $success = $mikrotik->isolir($router, $this->record->pppoe_username);

                    if (! $success) {
                        Notification::make()
                            ->title('Gagal isolir')
                            ->body('Tidak bisa terhubung ke Mikrotik atau PPP secret tidak ditemukan. Cek storage/logs/laravel.log untuk detail.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $this->record->update(['status' => 'isolir']);

                    IsolirLog::create([
                        'subscription_id' => $this->record->id,
                        'action' => 'isolir',
                        'reason' => null,
                        'triggered_by' => 'admin',
                        'admin_id' => auth()->id(),
                    ]);

                    $this->fillForm();

                    Notification::make()
                        ->title('Isolir berhasil')
                        ->success()
                        ->send();
                }),

            Action::make('restoreIsolir')
                ->label('Buka Isolir')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->visible(fn () => $this->record->status === 'isolir')
                ->requiresConfirmation()
                ->modalDescription('Pelanggan akan dikembalikan ke paket normal lewat Mikrotik. Lanjutkan?')
                ->action(function (MikrotikService $mikrotik) {
                    $router = $this->record->mikrotikRouter;

                    if (! $router) {
                        Notification::make()
                            ->title('Router belum dipilih')
                            ->body('Pilih Router Mikrotik dulu di form subscription ini.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $profileName = $this->record->package->mikrotik_profile_name;

                    $success = $mikrotik->restore($router, $this->record->pppoe_username, $profileName);

                    if (! $success) {
                        Notification::make()
                            ->title('Gagal buka isolir')
                            ->body('Tidak bisa terhubung ke Mikrotik atau PPP secret tidak ditemukan. Cek storage/logs/laravel.log untuk detail.')
                            ->danger()
                            ->send();

                        return;
                    }

                    $this->record->update(['status' => 'active']);

                    IsolirLog::create([
                        'subscription_id' => $this->record->id,
                        'action' => 'restore',
                        'reason' => null,
                        'triggered_by' => 'admin',
                        'admin_id' => auth()->id(),
                    ]);

                    $this->fillForm();

                    Notification::make()
                        ->title('Buka isolir berhasil')
                        ->success()
                        ->send();
                }),

            DeleteAction::make(),
        ];
    }
}