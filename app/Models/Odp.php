<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Odp extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'location_lat',
        'location_lng',
        'total_ports',
        'installed_at',
    ];

    protected function casts(): array
    {
        return [
            'location_lat' => 'decimal:7',
            'location_lng' => 'decimal:7',
            'total_ports' => 'integer',
            'installed_at' => 'date',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function usedPortsCount(): int
    {
        return $this->subscriptions()->where('status', 'active')->count();
    }

    public function availablePortsCount(): int
    {
        return max(0, $this->total_ports - $this->usedPortsCount());
    }
}