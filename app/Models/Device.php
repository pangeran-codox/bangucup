<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Device extends Model
{
    use HasFactory;

    // Tabel ini cuma punya kolom updated_at, tidak ada created_at
    const CREATED_AT = null;

    protected $fillable = [
        'customer_id',
        'genieacs_device_id',
        'serial_number',
        'brand_model',
        'last_inform_at',
        'last_status',
        'rx_power',
        'ssid',
    ];

    protected function casts(): array
    {
        return [
            'last_inform_at' => 'datetime',
            'rx_power' => 'decimal:2',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}