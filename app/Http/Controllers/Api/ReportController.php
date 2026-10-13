<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use App\Support\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function __invoke(Request $request, ReportService $reports, OrganizationContext $context): JsonResponse
    {
        abort_unless($context->membership()->isTeam(), 403, 'Reports are available to staff and administrators.');

        $filters = $request->validate([
            'period' => ['sometimes', Rule::in([7, 30, 90])],
        ]);

        return response()->json([
            'data' => $reports->summary($context->membership(), (int) ($filters['period'] ?? 30)),
        ]);
    }
}
