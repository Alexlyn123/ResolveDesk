<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use App\Support\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DashboardController extends Controller
{
    public function __invoke(Request $request, DashboardService $dashboard, OrganizationContext $context): JsonResponse
    {
        $filters = $request->validate([
            'period' => ['sometimes', Rule::in([7, 30, 90])],
        ]);

        return response()->json([
            'data' => $dashboard->build($request->user(), $context->membership(), (int) ($filters['period'] ?? 30)),
        ]);
    }
}
