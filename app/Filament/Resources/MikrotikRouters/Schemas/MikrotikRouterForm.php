<?php

namespace App\Filament\Resources\MikrotikRouters\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class MikrotikRouterForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail router')
                    ->columns(2)
                    ->components([
                        TextInput::make('name')
                            ->label('Nama/Label')
                            ->required()
                            ->maxLength(100)
                            ->placeholder('Misal: Router Pusat, Router Tower Ariel'),
                        TextInput::make('host')
                            ->label('Host/IP')
                            ->required()
                            ->maxLength(100)
                            ->placeholder('192.168.2.1'),
                        TextInput::make('api_port')
                            ->label('Port API')
                            ->required()
                            ->numeric()
                            ->default(8728),
                        TextInput::make('username')
                            ->label('Username API')
                            ->required()
                            ->maxLength(100),
                        TextInput::make('password')
                            ->label('Password API')
                            ->password()
                            ->revealable()
                            ->required(fn (string $operation) => $operation === 'create')
                            ->dehydrated(fn ($state) => filled($state))
                            ->maxLength(255)
                            ->helperText('Kosongkan kalau tidak mau mengubah password.'),
                    ]),

                Section::make('Status')
                    ->columns(2)
                    ->components([
                        Toggle::make('is_active')
                            ->label('Router aktif')
                            ->default(true),
                        Textarea::make('notes')
                            ->label('Catatan')
                            ->rows(2),
                    ]),
            ]);
    }
}