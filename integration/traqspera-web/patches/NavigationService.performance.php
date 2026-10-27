<?php

/**
 * Merge into App\Services\NavigationService::getNavigationOptions().
 * Adjust permission keys and route names to match traqspera-web.
 */
return [
    'label' => __('Performance'),
    'route' => 'performance-management.index',
    'icon' => 'clipboard',
    'permission' => 'view-performance-management',
    'children' => [
        [
            'label' => __('Dashboard'),
            'route' => 'performance-management.index',
            'query' => ['view' => 'hr_dashboard'],
        ],
        [
            'label' => __('Templates'),
            'route' => 'performance-management.index',
            'query' => ['view' => 'templates'],
        ],
        [
            'label' => __('Review groups'),
            'route' => 'performance-management.index',
            'query' => ['view' => 'review_groups'],
        ],
        [
            'label' => __('Team reviews'),
            'route' => 'performance-management.index',
            'query' => ['view' => 'manager_dashboard'],
        ],
    ],
];
