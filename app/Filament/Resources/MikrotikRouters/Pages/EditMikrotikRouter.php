<?php

namespace App\Filament\Resources\MikrotikRouters\Pages;

use App\Filament\Resources\MikrotikRouters\MikrotikRouterResource;
use App\Services\MikrotikService;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditMikrotikRouter extends EditRecord
{
    protected static string $resource = MikrotikRouterResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('testConnection')
                ->label('Test Koneksi')
                ->icon('heroicon-o-signal')
                ->color('gray')
                ->action(function (MikrotikService $mikrotik) {
                    $success = $mikrotik->testConnection($this->record);

                    if ($success) {
                        Notification::make()
                            ->title('Koneksi berhasil')
                            ->body("Berhasil terhubung ke router \"{$this->record->name}\".")
                            ->success()
                            ->send();

                        return;
                    }

                    Notification::make()
                        ->title('Koneksi gagal')
                        ->body('Tidak bisa terhubung. Cek host/port/username/password, atau lihat storage/logs/laravel.log untuk detail error.')
                        ->danger()
                        ->send();
                }),

            DeleteAction::make(),
        ];
    }
}