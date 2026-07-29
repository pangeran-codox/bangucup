<?php

namespace App\Filament\Resources\Customers\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class CustomerForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Informasi utama')
                    ->columns(2)
                    ->components([
                        TextInput::make('name')
                            ->label('Nama lengkap')
                            ->required()
                            ->maxLength(150),
                        TextInput::make('phone')
                            ->label('Nomor telepon')
                            ->tel()
                            ->required()
                            ->maxLength(20),
                        TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->maxLength(150),
                    ]),

                Section::make('Alamat & lokasi')
                    ->components([
                        Textarea::make('address')
                            ->label('Alamat lengkap')
                            ->required()
                            ->rows(3)
                            ->columnSpanFull(),
                        Grid::make(2)
                            ->components([
                                TextInput::make('coordinate_lat')
                                    ->label('Latitude')
                                    ->numeric()
                                    ->step(0.0000001),
                                TextInput::make('coordinate_lng')
                                    ->label('Longitude')
                                    ->numeric()
                                    ->step(0.0000001),
                            ]),
                    ]),

                Section::make('Status pelanggan')
                    ->columns(2)
                    ->components([
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->default('pending')
                            ->options([
                                'active' => 'Aktif',
                                'isolir' => 'Isolir',
                                'inactive' => 'Tidak aktif',
                                'pending' => 'Menunggu',
                            ]),
                        DatePicker::make('joined_at')
                            ->label('Tanggal bergabung')
                            ->default(now()),
                    ]),
            ]);
    }
}