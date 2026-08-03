<?php

namespace App\Filament\Resources\MikrotikRouters\Pages;

use App\Filament\Resources\MikrotikRouters\MikrotikRouterResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListMikrotikRouters extends ListRecords
{
    protected static string $resource = MikrotikRouterResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
