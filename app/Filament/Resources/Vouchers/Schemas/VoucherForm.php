<?php

namespace App\Filament\Resources\Vouchers\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class VoucherForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail voucher')
                    ->columns(2)
                    ->components([
                        TextInput::make('code')
                            ->label('Kode voucher')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(50)
                            ->placeholder('Misal: DISKON10'),
                        Select::make('applies_to')
                            ->label('Berlaku untuk')
                            ->required()
                            ->default('all')
                            ->options([
                                'installation' => 'Instalasi',
                                'monthly' => 'Tagihan bulanan',
                                'all' => 'Semua jenis',
                            ]),
                        Select::make('type')
                            ->label('Tipe diskon')
                            ->required()
                            ->live()
                            ->options([
                                'percentage' => 'Persentase (%)',
                                'fixed' => 'Nominal tetap (Rp)',
                            ]),
                        TextInput::make('value')
                            ->label('Nilai diskon')
                            ->required()
                            ->numeric()
                            ->prefix(fn ($get) => $get('type') === 'percentage' ? '%' : 'Rp'),
                    ]),

                Section::make('Masa berlaku & kuota')
                    ->columns(3)
                    ->components([
                        DatePicker::make('valid_from')
                            ->label('Berlaku dari')
                            ->required(),
                        DatePicker::make('valid_until')
                            ->label('Berlaku sampai')
                            ->required(),
                        TextInput::make('max_usage')
                            ->label('Maks. pemakaian')
                            ->numeric()
                            ->helperText('Kosongkan jika tidak terbatas'),
                    ]),
            ]);
    }
}