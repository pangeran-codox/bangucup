<?php

namespace App\Filament\Resources\Odps\Schemas;

use Dotswan\MapPicker\Fields\Map;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Set;
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
                        Map::make('location')
                            ->label('Klik di peta untuk set titik lokasi ODP')
                            ->columnSpanFull()
                            ->dehydrated(false)
                            ->defaultLocation(latitude: -2.5, longitude: 118.0) // fallback: tengah Indonesia, dipakai pas bikin ODP baru
                            ->clickable(true)
                            ->draggable(true)
                            ->zoom(15)
                            ->tilesUrl('https://tile.openstreetmap.de/{z}/{x}/{y}.png')
                            ->extraStyles(['min-height: 400px'])
                            ->afterStateUpdated(function (Set $set, ?array $state): void {
                                $set('location_lat', $state['lat'] ?? null);
                                $set('location_lng', $state['lng'] ?? null);
                            })
                            ->afterStateHydrated(function ($state, $record, Set $set): void {
                                if ($record && $record->location_lat && $record->location_lng) {
                                    $set('location', [
                                        'lat' => $record->location_lat,
                                        'lng' => $record->location_lng,
                                    ]);
                                }
                            }),

                        Grid::make(2)
                            ->components([
                                TextInput::make('location_lat')
                                    ->label('Latitude')
                                    ->numeric()
                                    ->step(0.0000001)
                                    ->readOnly(),
                                TextInput::make('location_lng')
                                    ->label('Longitude')
                                    ->numeric()
                                    ->step(0.0000001)
                                    ->readOnly(),
                            ]),
                    ]),
            ]);
    }
}