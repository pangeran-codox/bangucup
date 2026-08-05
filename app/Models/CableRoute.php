<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CableRoute extends Model
{
    protected $fillable = [
        'name',
        'odp_id',
        'customer_id',
        'path',
        'status',
    ];

    protected $casts = [
        'path' => 'array',
    ];

    public function odp(): BelongsTo
    {
        return $this->belongsTo(Odp::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}