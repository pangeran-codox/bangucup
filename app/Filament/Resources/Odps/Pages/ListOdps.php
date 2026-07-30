<?php

namespace App\Filament\Resources\Odps\Pages;

use App\Filament\Resources\Odps\OdpResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListOdps extends ListRecords
{
    protected static string $resource = OdpResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
