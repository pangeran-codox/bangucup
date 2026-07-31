<?php

namespace App\Filament\Resources\Tickets\Schemas;

use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Illuminate\Database\Eloquent\Builder;

class TicketForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Section::make('Pelanggan & langganan')
                    ->columns(2)
                    ->components([
                        Select::make('customer_id')
                            ->label('Pelanggan')
                            ->relationship('customer', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->live(),
                        Select::make('subscription_id')
                            ->label('Langganan terkait')
                            ->relationship(
                                name: 'subscription',
                                titleAttribute: 'pppoe_username',
                                modifyQueryUsing: fn (Builder $query, Get $get) => $query->where('customer_id', $get('customer_id')),
                            )
                            ->searchable()
                            ->preload()
                            ->disabled(fn (Get $get): bool => blank($get('customer_id')))
                            ->helperText('Opsional, pilih pelanggan dulu'),
                    ]),

                Section::make('Detail tiket')
                    ->components([
                        TextInput::make('subject')
                            ->label('Judul')
                            ->required()
                            ->maxLength(200)
                            ->columnSpanFull(),
                        Textarea::make('description')
                            ->label('Deskripsi keluhan')
                            ->rows(4)
                            ->columnSpanFull(),
                    ]),

                Section::make('Prioritas & penugasan')
                    ->columns(2)
                    ->components([
                        Select::make('priority')
                            ->label('Prioritas')
                            ->required()
                            ->default('medium')
                            ->options([
                                'low' => 'Rendah',
                                'medium' => 'Sedang',
                                'high' => 'Tinggi',
                            ]),
                        Select::make('status')
                            ->label('Status')
                            ->required()
                            ->default('open')
                            ->live()
                            ->options([
                                'open' => 'Terbuka',
                                'in_progress' => 'Diproses',
                                'resolved' => 'Selesai',
                                'closed' => 'Ditutup',
                            ]),
                        Select::make('assigned_to')
                            ->label('Ditugaskan ke')
                            ->relationship('assignedTo', 'name')
                            ->searchable()
                            ->preload(),
                        DateTimePicker::make('resolved_at')
                            ->label('Waktu selesai')
                            ->visible(fn (Get $get): bool => in_array($get('status'), ['resolved', 'closed'])),
                    ]),
            ]);
    }
}