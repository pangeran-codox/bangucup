<?php

namespace App\Filament\Resources\NotificationLogs\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class NotificationLogsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('customer.name')
                    ->label('Pelanggan')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('type')
                    ->label('Jenis')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'reminder' => 'Pengingat tagihan',
                        'isolir_notice' => 'Pemberitahuan isolir',
                        'payment_success' => 'Konfirmasi pembayaran',
                        default => $state,
                    }),
                TextColumn::make('channel')
                    ->label('Kanal')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'whatsapp' ? 'success' : 'info')
                    ->formatStateUsing(fn (string $state): string => $state === 'whatsapp' ? 'WhatsApp' : 'Email'),
                TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'sent' ? 'success' : 'danger')
                    ->formatStateUsing(fn (string $state): string => $state === 'sent' ? 'Terkirim' : 'Gagal'),
                TextColumn::make('sent_at')
                    ->label('Waktu kirim')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'sent' => 'Terkirim',
                        'failed' => 'Gagal',
                    ]),
                SelectFilter::make('channel')
                    ->label('Kanal')
                    ->options([
                        'whatsapp' => 'WhatsApp',
                        'email' => 'Email',
                    ]),
            ])
            ->defaultSort('sent_at', 'desc')
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}