<?php

namespace App\Filament\Resources\Devices\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class DeviceForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Perangkat & pelanggan')
                    ->columns(2)
                    ->components([
                        Select::make('customer_id')
                            ->label('Pelanggan')
                            ->relationship('customer', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        TextInput::make('genieacs_device_id')
                            ->label('ID GenieACS')
                            ->required()
                            ->maxLength(150)
                            ->helperText('ID unik device dari sistem GenieACS'),
                        TextInput::make('serial_number')
                            ->label('Nomor seri')
                            ->maxLength(100),
                        TextInput::make('brand_model')
                            ->label('Merk / model')
                            ->maxLength(100)
                            ->placeholder('Misal: ZTE F609'),
                    ]),

                Section::make('Status monitoring')
                    ->columns(2)
                    ->components([
                        Select::make('last_status')
                            ->label('Status terakhir')
                            ->required()
                            ->default('unknown')
                            ->options([
                                'online' => 'Online',
                                'offline' => 'Offline',
                                'unknown' => 'Belum diketahui',
                            ]),
                        DateTimePicker::make('last_inform_at')
                            ->label('Terakhir lapor'),
                        TextInput::make('rx_power')
                            ->label('Sinyal RX')
                            ->numeric()
                            ->suffix('dBm'),
                        TextInput::make('ssid')
                            ->label('SSID WiFi')
                            ->maxLength(100),
                    ]),
            ]);
    }
}