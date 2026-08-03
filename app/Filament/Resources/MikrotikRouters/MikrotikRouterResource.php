<?php

namespace App\Filament\Resources\MikrotikRouters;

use App\Filament\Resources\MikrotikRouters\Pages\CreateMikrotikRouter;
use App\Filament\Resources\MikrotikRouters\Pages\EditMikrotikRouter;
use App\Filament\Resources\MikrotikRouters\Pages\ListMikrotikRouters;
use App\Filament\Resources\MikrotikRouters\Schemas\MikrotikRouterForm;
use App\Filament\Resources\MikrotikRouters\Tables\MikrotikRoutersTable;
use App\Models\MikrotikRouter;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class MikrotikRouterResource extends Resource
{
    protected static ?string $model = MikrotikRouter::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedRectangleStack;

    public static function form(Schema $schema): Schema
    {
        return MikrotikRouterForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return MikrotikRoutersTable::configure($table);
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
            'index' => ListMikrotikRouters::route('/'),
            'create' => CreateMikrotikRouter::route('/create'),
            'edit' => EditMikrotikRouter::route('/{record}/edit'),
        ];
    }
}
