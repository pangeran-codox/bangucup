<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetMovement extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $fillable = [
        'asset_id',
        'type',
        'qty',
        'subscription_id',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'qty' => 'integer',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    protected static function booted(): void
    {
        static::created(function (AssetMovement $movement) {
            $delta = $movement->type === 'in' ? $movement->qty : -$movement->qty;
            $movement->asset()->increment('stock_qty', $delta);
        });
    }
}