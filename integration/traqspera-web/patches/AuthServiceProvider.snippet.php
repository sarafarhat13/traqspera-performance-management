<?php

// Add to App\Providers\AuthServiceProvider::$policies:
use App\Models\PerformanceManagementState;
use App\Policies\PerformanceManagementPolicy;

protected $policies = [
    // ...
    PerformanceManagementState::class => PerformanceManagementPolicy::class,
];

// Optional Gate alias for the page controller:
Gate::define('viewPerformanceManagement', [PerformanceManagementPolicy::class, 'viewAny']);
