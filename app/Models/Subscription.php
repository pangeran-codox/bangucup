<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'package_id',
        'odp_id',
        'port_number',
        'pppoe_username',
        'pppoe_password',
        'billing_due_date',
        'status',
        'started_at',
        'ended_at',
    ];

    protected $hidden = [
        'pppoe_password',
    ];

    protected function casts(): array
    {
        return [
            'port_number' => 'integer',
            'billing_due_date' => 'integer',
            'started_at' => 'date',
            'ended_at' => 'date',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function package(): BelongsTo
    {
        return $this->belongsTo(Package::class);
    }

    public function odp(): BelongsTo
    {
        return $this->belongsTo(Odp::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function isolirLogs(): HasMany
    {
        return $this->hasMany(IsolirLog::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function assetMovements(): HasMany
    {
        return $this->hasMany(AssetMovement::class);
    }
}