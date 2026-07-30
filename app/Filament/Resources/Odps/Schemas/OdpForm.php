<?php

namespace App\Filament\Resources\Odps\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class OdpForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail ODP')
                    ->columns(2)
                    ->components([
                        TextInput::make('name')
                            ->label('Nama ODP')
                            ->required()
                            ->maxLength(100)
                            ->placeholder('Misal: ODP-RW03-01'),
                        TextInput::make('total_ports')
                            ->label('Total port')
                            ->required()
                            ->numeric()
                            ->default(8)
                            ->minValue(1),
                        DatePicker::make('installed_at')
                            ->label('Tanggal pasang'),
                    ]),

                Section::make('Lokasi')
                    ->components([
                        Grid::make(2)
                            ->components([
                                TextInput::make('location_lat')
                                    ->label('Latitude')
                                    ->numeric()
                                    ->step(0.0000001),
                                TextInput::make('location_lng')
                                    ->label('Longitude')
                                    ->numeric()
                                    ->step(0.0000001),
                            ]),
                    ]),
            ]);
    }
}