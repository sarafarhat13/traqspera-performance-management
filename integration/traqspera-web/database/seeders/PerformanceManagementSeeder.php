<?php

namespace Database\Seeders;

use App\Models\PerformanceManagementState;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class PerformanceManagementSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('seeders/data/performance_bootstrap.json');
        if (! File::exists($path)) {
            $this->command?->warn('Missing performance_bootstrap.json — run prototype npm run export:performance-bootstrap');

            return;
        }

        $payload = json_decode(File::get($path), true, 512, JSON_THROW_ON_ERROR);

        PerformanceManagementState::query()->updateOrCreate(
            ['company_id' => 1],
            ['payload' => $payload],
        );
    }
}
