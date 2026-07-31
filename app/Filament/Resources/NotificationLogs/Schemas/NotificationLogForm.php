<?php

namespace App\Filament\Resources\NotificationLogs\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class NotificationLogForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail notifikasi')
                    ->columns(2)
                    ->components([
                        Select::make('customer_id')
                            ->label('Pelanggan')
                            ->relationship('customer', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('type')
                            ->label('Jenis')
                            ->required()
                            ->options([
                                'reminder' => 'Pengingat tagihan',
                                'isolir_notice' => 'Pemberitahuan isolir',
                                'payment_success' => 'Konfirmasi pembayaran',
                            ]),
                        Select::make('channel')
                            ->label('Kanal')
                            ->required()
                            ->options([
                                'whatsapp' => 'WhatsApp',
                                'email' => 'Email',
                            ]),
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->options([
                                'sent' => 'Terkirim',
                                'failed' => 'Gagal',
                            ]),
                        DateTimePicker::make('sent_at')
                            ->label('Waktu kirim')
                            ->default(now()),
                    ]),
            ]);
    }
}