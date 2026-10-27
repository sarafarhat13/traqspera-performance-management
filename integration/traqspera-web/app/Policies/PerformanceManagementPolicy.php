<?php

namespace App\Policies;

use App\Models\User;

class PerformanceManagementPolicy
{
    public function viewAny(User $user): bool
    {
        return $this->canAccess($user);
    }

    public function view(User $user): bool
    {
        return $this->canAccess($user);
    }

    public function updateState(User $user): bool
    {
        return $this->canAccess($user);
    }

    private function canAccess(User $user): bool
    {
        if (method_exists($user, 'hasPermission')) {
            return $user->hasPermission('view-performance-management')
                || $user->hasPermission('manage-performance-management');
        }

        return true;
    }
}
