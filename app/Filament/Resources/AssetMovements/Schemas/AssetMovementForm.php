<?php

namespace App\Filament\Resources\AssetMovements\Schemas;

use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class AssetMovementForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail pergerakan stok')
                    ->columns(2)
                    ->components([
                        Select::make('asset_id')
                            ->label('Barang')
                            ->relationship('asset', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        Select::make('type')
                            ->label('Jenis')
                            ->required()
                            ->options([
                                'in' => 'Masuk (restok)',
                                'out' => 'Keluar (dipakai)',
                            ]),
                        TextInput::make('qty')
                            ->label('Jumlah')
                            ->required()
                            ->numeric()
                            ->minValue(1),
                        Select::make('subscription_id')
                            ->label('Untuk langganan')
                            ->relationship('subscription', 'pppoe_username')
                            ->searchable()
                            ->preload()
                            ->helperText('Opsional, isi jika dipakai untuk pasang pelanggan tertentu'),
                        TextInput::make('note')
                            ->label('Catatan')
                            ->maxLength(255)
                            ->columnSpanFull(),
                    ]),
            ]);
    }
}