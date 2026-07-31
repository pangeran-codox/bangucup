<?php

namespace App\Filament\Resources\TicketReplies\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class TicketReplyForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Balasan tiket')
                    ->components([
                        Select::make('ticket_id')
                            ->label('Tiket')
                            ->relationship('ticket', 'subject')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('user_id')
                            ->label('Dibalas oleh (admin)')
                            ->relationship('user', 'name')
                            ->searchable()
                            ->preload()
                            ->helperText('Kosongkan jika balasan berasal dari pelanggan'),
                        Textarea::make('message')
                            ->label('Pesan')
                            ->required()
                            ->rows(4)
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}