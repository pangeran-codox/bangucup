<?php

namespace App\Filament\Resources\Packages\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class PackageForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail paket')
                    ->columns(2)
                    ->components([
                        TextInput::make('name')
                            ->label('Nama paket')
                            ->required()
                            ->maxLength(100)
                            ->placeholder('Misal: 10 Mbps Home'),
                        TextInput::make('speed_mbps')
                            ->label('Kecepatan')
                            ->required()
                            ->numeric()
                            ->suffix('Mbps'),
                        TextInput::make('price')
                            ->label('Harga bulanan')
                            ->required()
                            ->numeric()
                            ->prefix('Rp'),
                        TextInput::make('mikrotik_profile_name')
                            ->label('Nama profile Mikrotik')
                            ->required()
                            ->maxLength(100)
                            ->helperText('Harus sama persis dengan nama PPP Profile di Mikrotik'),
                    ]),

                Section::make('Status')
                    ->components([
                        Toggle::make('is_active')
                            ->label('Paket aktif')
                            ->default(true)
                            ->helperText('Paket nonaktif tidak akan muncul sebagai pilihan saat menambah langganan baru'),
                    ]),
            ]);
    }
}