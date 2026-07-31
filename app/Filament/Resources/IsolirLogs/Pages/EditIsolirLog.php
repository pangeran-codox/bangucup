<?php

namespace App\Filament\Resources\IsolirLogs\Pages;

use App\Filament\Resources\IsolirLogs\IsolirLogResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditIsolirLog extends EditRecord
{
    protected static string $resource = IsolirLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
