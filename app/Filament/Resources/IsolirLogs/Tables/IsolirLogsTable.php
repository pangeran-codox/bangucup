<?php

namespace App\Filament\Resources\IsolirLogs\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class IsolirLogsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('subscription.pppoe_username')
                    ->label('Langganan')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('subscription.customer.name')
                    ->label('Pelanggan')
                    ->searchable(),
                TextColumn::make('action')
                    ->label('Aksi')
                    ->badge()
                    ->color(fn (string $state): string => $state === 'isolir' ? 'danger' : 'success')
                    ->formatStateUsing(fn (string $state): string => $state === 'isolir' ? 'Isolir' : 'Buka isolir'),
                TextColumn::make('triggered_by')
                    ->label('Dipicu oleh')
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (string $state): string => $state === 'system' ? 'Sistem' : 'Admin'),
                TextColumn::make('admin.name')
                    ->label('Admin')
                    ->placeholder('-')
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('reason')
                    ->label('Alasan')
                    ->limit(50)
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->label('Waktu')
                    ->dateTime('d M Y H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('action')
                    ->label('Aksi')
                    ->options([
                        'isolir' => 'Isolir',
                        'restore' => 'Buka isolir',
                    ]),
            ])
            ->defaultSort('created_at', 'desc')
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