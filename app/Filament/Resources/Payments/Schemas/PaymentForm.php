<?php

namespace App\Filament\Resources\Payments\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;

class PaymentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Invoice & metode')
                    ->columns(2)
                    ->components([
                        Select::make('invoice_id')
                            ->label('Invoice')
                            ->relationship('invoice', 'invoice_number')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('gateway')
                            ->label('Payment gateway')
                            ->required()
                            ->default('manual')
                            ->options([
                                'midtrans' => 'Midtrans',
                                'xendit' => 'Xendit',
                                'manual' => 'Manual (tunai/transfer)',
                                'other' => 'Lainnya',
                            ]),
                        TextInput::make('method')
                            ->label('Metode pembayaran')
                            ->maxLength(50)
                            ->placeholder('Misal: QRIS, Transfer BCA, Tunai'),
                        TextInput::make('gateway_transaction_id')
                            ->label('ID transaksi gateway')
                            ->maxLength(150)
                            ->helperText('Kosongkan jika pembayaran manual'),
                    ]),

                Section::make('Nominal & status')
                    ->columns(2)
                    ->components([
                        TextInput::make('amount')
                            ->label('Jumlah dibayar')
                            ->required()
                            ->numeric()
                            ->prefix('Rp'),
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->default('pending')
                            ->live()
                            ->options([
                                'pending' => 'Menunggu',
                                'success' => 'Berhasil',
                                'failed' => 'Gagal',
                                'expired' => 'Kedaluwarsa',
                            ]),
                        DateTimePicker::make('paid_at')
                            ->label('Waktu pembayaran')
                            ->visible(fn (Get $get): bool => $get('status') === 'success'),
                    ]),
            ]);
    }
}