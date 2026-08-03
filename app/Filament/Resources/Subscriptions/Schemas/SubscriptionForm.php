<?php

namespace App\Filament\Resources\Subscriptions\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class SubscriptionForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Pelanggan & paket')
                    ->columns(2)
                    ->components([
                        Select::make('customer_id')
                            ->label('Pelanggan')
                            ->relationship('customer', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('package_id')
                            ->label('Paket')
                            ->relationship('package', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                    ]),

                Section::make('Lokasi jaringan')
                    ->columns(2)
                    ->components([
                        Select::make('odp_id')
                            ->label('ODP')
                            ->relationship('odp', 'name')
                            ->searchable()
                            ->preload(),
                        TextInput::make('port_number')
                            ->label('Nomor port')
                            ->numeric(),
                    ]),

                Section::make('Kredensial PPPoE')
                    ->columns(2)
                    ->components([
                        TextInput::make('pppoe_username')
                            ->label('Username PPPoE')
                            ->required()
                            ->maxLength(100),
                        TextInput::make('pppoe_password')
                            ->label('Password PPPoE')
                            ->password()
                            ->revealable()
                            ->required()
                            ->maxLength(255),
                    ]),

                Section::make('Billing & status')
                    ->columns(2)
                    ->components([
                        TextInput::make('billing_due_date')
                            ->label('Tanggal jatuh tempo')
                            ->required()
                            ->numeric()
                            ->default(1)
                            ->minValue(1)
                            ->maxValue(28)
                            ->helperText('Tanggal 1-28 tiap bulan'),
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->default('active')
                            ->options([
                                'active' => 'Aktif',
                                'isolir' => 'Isolir',
                                'terminated' => 'Berhenti',
                            ]),
                        Grid::make(2)
                            ->columnSpanFull()
                            ->components([
                                DatePicker::make('started_at')
                                    ->label('Mulai berlangganan')
                                    ->required()
                                    ->default(now()),
                                DatePicker::make('ended_at')
                                    ->label('Berhenti berlangganan'),
                            ]),
                    ]),
                Section::make('Lokasi jaringan')
                    ->columns(2)
                    ->components([
                        Select::make('odp_id')
                            ->label('ODP')
                            ->relationship('odp', 'name')
                            ->searchable()
                            ->preload(),
                        TextInput::make('port_number')
                            ->label('Nomor port')
                            ->numeric(),
                        Select::make('mikrotik_router_id')
                            ->label('Router Mikrotik')
                            ->relationship('mikrotikRouter', 'name')
                            ->searchable()
                            ->preload()
                            ->helperText('Router yang mengelola koneksi PPPoE pelanggan ini'),
                    ]),
            ]);
    }
}