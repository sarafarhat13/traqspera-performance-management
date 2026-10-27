<?php

use App\Http\Controllers\Api\PerformanceManagementStateController;
use App\Http\Controllers\PerformanceManagementController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'auth'])->group(function () {
    Route::get('/performance', [PerformanceManagementController::class, 'index'])
        ->name('performance-management.index');
});

Route::middleware(['web', 'auth'])->prefix('api/performance-management')->group(function () {
    Route::get('/state', [PerformanceManagementStateController::class, 'show']);
    Route::put('/state', [PerformanceManagementStateController::class, 'update']);
});
