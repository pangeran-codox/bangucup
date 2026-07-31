<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'sku',
        'stock_qty',
        'unit',
    ];

    protected function casts(): array
    {
        return [
            'stock_qty' => 'integer',
        ];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(AssetMovement::class);
    }
}