<?php

namespace App\Filament\Resources\IsolirLogs\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class IsolirLogForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail isolir')
                    ->columns(2)
                    ->components([
                        Select::make('subscription_id')
                            ->label('Langganan')
                            ->relationship('subscription', 'pppoe_username')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('action')
                            ->label('Aksi')
                            ->required()
                            ->options([
                                'isolir' => 'Isolir',
                                'restore' => 'Buka isolir',
                            ]),
                        Select::make('triggered_by')
                            ->label('Dipicu oleh')
                            ->required()
                            ->live()
                            ->options([
                                'system' => 'Sistem (otomatis)',
                                'admin' => 'Admin (manual)',
                            ]),
                        Select::make('admin_id')
                            ->label('Admin')
                            ->relationship('admin', 'name')
                            ->searchable()
                            ->preload()
                            ->visible(fn (Get $get): bool => $get('triggered_by') === 'admin'),
                        TextInput::make('reason')
                            ->label('Alasan')
                            ->maxLength(255)
                            ->placeholder('Misal: overdue invoice #123')
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}