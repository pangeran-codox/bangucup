<?php

namespace App\Filament\Resources\Invoices\Schemas;

use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Schema;

class InvoiceForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Select::make('customer_id')
                    ->relationship('customer', 'name')
                    ->required(),
                Select::make('subscription_id')
                    ->relationship('subscription', 'id')
                    ->required(),
                Select::make('voucher_id')
                    ->relationship('voucher', 'id'),
                TextInput::make('invoice_number')
                    ->required(),
                TextInput::make('type')
                    ->required()
                    ->default('monthly'),
                DatePicker::make('period_month'),
                TextInput::make('amount')
                    ->required()
                    ->numeric(),
                TextInput::make('discount_amount')
                    ->required()
                    ->numeric()
                    ->default(0),
                DatePicker::make('due_date')
                    ->required(),
                TextInput::make('status')
                    ->required()
                    ->default('unpaid'),
                DateTimePicker::make('paid_at'),
            ]);
    }
}
