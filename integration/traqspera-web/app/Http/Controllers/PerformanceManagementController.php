<?php

namespace App\Http\Controllers;

use App\Models\PerformanceManagementState;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PerformanceManagementController extends Controller
{
    public function index(Request $request): View
    {
        $this->authorize('viewAny', PerformanceManagementState::class);

        $initialView = $request->query('view', 'hr_dashboard');

        return view('performance-management.index', [
            'initialView' => $initialView,
            'apiBaseUrl' => url('/api/performance-management'),
            'currentUserPersonId' => $this->resolvePersonId($request),
        ]);
    }

    private function resolvePersonId(Request $request): string
    {
        $user = $request->user();
        if ($user && isset($user->performance_person_id)) {
            return (string) $user->performance_person_id;
        }

        return 'mgr-1';
    }
}
