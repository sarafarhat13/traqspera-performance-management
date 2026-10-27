<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PerformanceManagementState extends Model
{
    protected $table = 'performance_management_states';

    protected $fillable = [
        'company_id',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];
}
