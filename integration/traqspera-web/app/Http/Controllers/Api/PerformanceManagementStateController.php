<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PerformanceManagementState;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PerformanceManagementStateController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $this->authorize('view', PerformanceManagementState::class);

        $companyId = $this->companyId($request);
        $row = PerformanceManagementState::query()->where('company_id', $companyId)->first();

        if (! $row) {
            return response()->json([
                'message' => 'No performance state seeded for company.',
            ], 404);
        }

        $payload = $row->payload;
        $payload['activePersonId'] = $this->resolveActivePersonId($request, $payload);

        return response()->json($payload);
    }

    public function update(Request $request): JsonResponse
    {
        $this->authorize('updateState', PerformanceManagementState::class);

        $validated = $request->validate([
            'activePersonId' => 'nullable|string',
            'templates' => 'required|array',
            'reviewGroups' => 'required|array',
            'cycles' => 'required|array',
            'reviews' => 'required|array',
            'seedVersion' => 'nullable|integer',
        ]);

        $companyId = $this->companyId($request);
        $row = PerformanceManagementState::query()->firstOrNew(['company_id' => $companyId]);
        $existing = $row->payload ?? [];
        $row->payload = array_merge($existing, $validated, [
            'people' => $existing['people'] ?? [],
        ]);
        $row->save();

        return response()->json(['ok' => true]);
    }

    private function companyId(Request $request): int
    {
        $user = $request->user();
        if ($user && isset($user->company_id)) {
            return (int) $user->company_id;
        }

        return 1;
    }

    private function resolveActivePersonId(Request $request, array $payload): string
    {
        $user = $request->user();
        if ($user && isset($user->performance_person_id)) {
            return (string) $user->performance_person_id;
        }

        return $payload['activePersonId'] ?? 'mgr-1';
    }
}
