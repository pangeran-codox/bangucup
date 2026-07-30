<?php

namespace App\Filament\Resources\Odps;

use App\Filament\Resources\Odps\Pages\CreateOdp;
use App\Filament\Resources\Odps\Pages\EditOdp;
use App\Filament\Resources\Odps\Pages\ListOdps;
use App\Filament\Resources\Odps\Schemas\OdpForm;
use App\Filament\Resources\Odps\Tables\OdpsTable;
use App\Models\Odp;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class OdpResource extends Resource
{
    protected static ?string $model = Odp::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedMapPin;

    protected static ?string $navigationLabel = 'ODP';

    protected static ?string $modelLabel = 'ODP';

    protected static ?string $pluralModelLabel = 'ODP';

    public static function form(Schema $schema): Schema
    {
        return OdpForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return OdpsTable::configure($table);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListOdps::route('/'),
            'create' => CreateOdp::route('/create'),
            'edit' => EditOdp::route('/{record}/edit'),
        ];
    }
}