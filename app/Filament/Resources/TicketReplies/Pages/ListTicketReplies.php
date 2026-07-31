<?php

namespace App\Filament\Resources\TicketReplies\Pages;

use App\Filament\Resources\TicketReplies\TicketReplyResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListTicketReplies extends ListRecords
{
    protected static string $resource = TicketReplyResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
