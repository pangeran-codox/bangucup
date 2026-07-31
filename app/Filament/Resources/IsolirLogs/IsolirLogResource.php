<?php

namespace App\Filament\Resources\IsolirLogs;

use App\Filament\Resources\IsolirLogs\Pages\CreateIsolirLog;
use App\Filament\Resources\IsolirLogs\Pages\EditIsolirLog;
use App\Filament\Resources\IsolirLogs\Pages\ListIsolirLogs;
use App\Filament\Resources\IsolirLogs\Schemas\IsolirLogForm;
use App\Filament\Resources\IsolirLogs\Tables\IsolirLogsTable;
use App\Models\IsolirLog;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;

class IsolirLogResource extends Resource
{
    protected static ?string $model = IsolirLog::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedNoSymbol;

    protected static ?string $navigationLabel = 'Log Isolir';

    protected static ?string $modelLabel = 'Log Isolir';

    protected static ?string $pluralModelLabel = 'Log Isolir';

    public static function form(Schema $schema): Schema
    {
        return IsolirLogForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return IsolirLogsTable::configure($table);
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
            'index' => ListIsolirLogs::route('/'),
            'create' => CreateIsolirLog::route('/create'),
            'edit' => EditIsolirLog::route('/{record}/edit'),
        ];
    }
}