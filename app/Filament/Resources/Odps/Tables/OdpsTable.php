<?php

namespace App\Filament\Resources\Odps\Tables;

use App\Models\Odp;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class OdpsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label('Nama ODP')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('total_ports')
                    ->label('Total port')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('port_usage')
                    ->label('Pemakaian port')
                    ->state(fn (Odp $record): string => "{$record->usedPortsCount()} / {$record->total_ports}")
                    ->badge()
                    ->color(function (Odp $record): string {
                        $used = $record->usedPortsCount();
                        if ($record->total_ports <= 0) {
                            return 'gray';
                        }
                        $ratio = $used / $record->total_ports;

                        return match (true) {
                            $ratio >= 1 => 'danger',
                            $ratio >= 0.75 => 'warning',
                            default => 'success',
                        };
                    }),
                TextColumn::make('installed_at')
                    ->label('Tanggal pasang')
                    ->date('d M Y')
                    ->sortable(),
                TextColumn::make('location_lat')
                    ->label('Latitude')
                    ->numeric()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('location_lng')
                    ->label('Longitude')
                    ->numeric()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->defaultSort('name', 'asc')
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