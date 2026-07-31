<?php

namespace App\Filament\Resources\TicketReplies\Pages;

use App\Filament\Resources\TicketReplies\TicketReplyResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditTicketReply extends EditRecord
{
    protected static string $resource = TicketReplyResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }
}
