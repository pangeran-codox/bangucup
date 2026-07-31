<?php

namespace App\Filament\Resources\Assets\Schemas;

use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class AssetForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Detail aset')
                    ->columns(2)
                    ->components([
                        TextInput::make('name')
                            ->label('Nama barang')
                            ->required()
                            ->maxLength(150)
                            ->placeholder('Misal: ONU ZTE F609'),
                        TextInput::make('category')
                            ->label('Kategori')
                            ->required()
                            ->maxLength(50)
                            ->placeholder('Misal: onu, kabel, konektor'),
                        TextInput::make('sku')
                            ->label('SKU')
                            ->maxLength(50),
                        TextInput::make('stock_qty')
                            ->label('Stok saat ini')
                            ->required()
                            ->numeric()
                            ->default(0),
                        TextInput::make('unit')
                            ->label('Satuan')
                            ->required()
                            ->default('pcs')
                            ->maxLength(20)
                            ->placeholder('pcs, meter, dll'),
                    ]),
            ]);
    }
}