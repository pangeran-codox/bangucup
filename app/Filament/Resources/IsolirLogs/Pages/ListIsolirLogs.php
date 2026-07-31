<?php

namespace App\Filament\Resources\IsolirLogs\Pages;

use App\Filament\Resources\IsolirLogs\IsolirLogResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListIsolirLogs extends ListRecords
{
    protected static string $resource = IsolirLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
