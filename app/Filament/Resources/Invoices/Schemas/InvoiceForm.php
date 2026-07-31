<?php

namespace App\Filament\Resources\Invoices\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Illuminate\Database\Eloquent\Builder;

class InvoiceForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Pelanggan & langganan')
                    ->columns(2)
                    ->components([
                        Select::make('customer_id')
                            ->label('Pelanggan')
                            ->relationship('customer', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->live(),
                        Select::make('subscription_id')
                            ->label('Langganan')
                            ->relationship(
                                name: 'subscription',
                                titleAttribute: 'pppoe_username',
                                modifyQueryUsing: fn (Builder $query, Get $get) => $query->where('customer_id', $get('customer_id')),
                            )
                            ->searchable()
                            ->preload()
                            ->required()
                            ->disabled(fn (Get $get): bool => blank($get('customer_id')))
                            ->helperText('Pilih pelanggan terlebih dahulu'),
                    ]),

                Section::make('Detail tagihan')
                    ->columns(2)
                    ->components([
                        TextInput::make('invoice_number')
                            ->label('Nomor invoice')
                            ->disabled()
                            ->dehydrated(false)
                            ->placeholder('Akan dibuat otomatis saat disimpan'),
                        Select::make('type')
                            ->label('Jenis tagihan')
                            ->required()
                            ->default('monthly')
                            ->options([
                                'installation' => 'Instalasi',
                                'monthly' => 'Bulanan',
                                'other' => 'Lainnya',
                            ]),
                        DatePicker::make('period_month')
                            ->label('Periode tagihan'),
                        DatePicker::make('due_date')
                            ->label('Jatuh tempo')
                            ->required(),
                    ]),

                Section::make('Nominal & diskon')
                    ->columns(3)
                    ->components([
                        TextInput::make('amount')
                            ->label('Jumlah tagihan')
                            ->required()
                            ->numeric()
                            ->prefix('Rp'),
                        TextInput::make('discount_amount')
                            ->label('Diskon')
                            ->required()
                            ->numeric()
                            ->default(0)
                            ->prefix('Rp'),
                        Select::make('voucher_id')
                            ->label('Voucher')
                            ->relationship('voucher', 'code')
                            ->searchable()
                            ->preload(),
                    ]),

                Section::make('Status pembayaran')
                    ->columns(2)
                    ->components([
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->default('unpaid')
                            ->live()
                            ->options([
                                'unpaid' => 'Belum bayar',
                                'paid' => 'Lunas',
                                'overdue' => 'Terlambat',
                                'cancelled' => 'Dibatalkan',
                            ]),
                        DateTimePicker::make('paid_at')
                            ->label('Waktu pembayaran')
                            ->visible(fn (Get $get): bool => $get('status') === 'paid'),
                    ]),
            ]);
    }
}