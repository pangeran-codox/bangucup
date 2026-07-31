<?php

namespace App\Filament\Resources\Vouchers\Tables;

use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class VouchersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('code')
                    ->label('Kode')
                    ->searchable()
                    ->sortable()
                    ->weight('bold'),
                TextColumn::make('type')
                    ->label('Tipe')
                    ->badge()
                    ->color('info')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'percentage' => 'Persentase',
                        'fixed' => 'Nominal tetap',
                        default => $state,
                    }),
                TextColumn::make('value')
                    ->label('Nilai')
                    ->formatStateUsing(fn ($state, $record): string => $record->type === 'percentage'
                        ? "{$state}%"
                        : 'Rp'.number_format((float) $state, 0, ',', '.')),
                TextColumn::make('applies_to')
                    ->label('Berlaku untuk')
                    ->badge()
                    ->color('gray')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'installation' => 'Instalasi',
                        'monthly' => 'Bulanan',
                        'all' => 'Semua',
                        default => $state,
                    }),
                TextColumn::make('valid_until')
                    ->label('Berlaku sampai')
                    ->date('d M Y')
                    ->sortable(),
                TextColumn::make('used_count')
                    ->label('Terpakai')
                    ->formatStateUsing(fn ($state, $record): string => $record->max_usage
                        ? "{$state} / {$record->max_usage}"
                        : (string) $state),
            ])
            ->filters([
                //
            ])
            ->defaultSort('valid_until', 'desc')
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