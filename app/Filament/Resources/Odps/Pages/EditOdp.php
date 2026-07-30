<?php

namespace App\Filament\Resources\Odps\Pages;

use App\Filament\Resources\Odps\OdpResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditOdp extends EditRecord
{
    protected static string $resource = OdpResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
