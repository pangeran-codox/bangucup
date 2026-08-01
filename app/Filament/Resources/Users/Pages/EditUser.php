<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;
use Filament\Support\Exceptions\Halt;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make()
                ->hidden(fn () => $this->record->id === auth()->id()),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        $data['role'] = $this->record->roles->first()?->name;

        return $data;
    }

    protected function beforeSave(): void
    {
        if ($this->record->id === auth()->id() && $this->record->hasRole('super_admin') && $this->data['role'] !== 'super_admin') {
            Notification::make()
                ->title('Tidak bisa mengubah role sendiri')
                ->body('Kamu tidak bisa mengubah role akunmu sendiri dari Super Admin ke role lain.')
                ->danger()
                ->send();

            throw new Halt();
        }
    }

    protected function afterSave(): void
    {
        $this->record->syncRoles([$this->data['role']]);
    }
}