@extends('layouts.app')

@section('title', __('Performance Management'))

@section('content')
    <div id="performance-management" class="min-h-[60vh] w-full"></div>
@endsection

@push('styles')
    <link rel="stylesheet" href="{{ asset('css/performance-management.css') }}">
@endpush

@push('scripts')
    <script src="{{ asset('js/performance-management.js') }}" defer></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            if (!window.TraqsperaPerformance || !window.TraqsperaPerformance.mount) {
                console.error('TraqsperaPerformance island bundle not loaded');
                return;
            }
            window.TraqsperaPerformance.mount(
                document.getElementById('performance-management'),
                {
                    apiBaseUrl: @json($apiBaseUrl),
                    dataSource: 'api',
                    initialView: @json($initialView),
                    currentUserPersonId: @json($currentUserPersonId),
                }
            );
        });
    </script>
@endpush
