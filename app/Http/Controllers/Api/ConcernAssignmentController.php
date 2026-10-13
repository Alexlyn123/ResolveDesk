<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Concerns\AssignConcernRequest;
use App\Http\Resources\ConcernResource;
use App\Models\Concern;
use App\Models\User;
use App\Services\ConcernService;

class ConcernAssignmentController extends Controller
{
    public function __invoke(AssignConcernRequest $request, Concern $concern, ConcernService $concerns): ConcernResource
    {
        $assigneeId = $request->validated('assigned_to');

        $concerns->assign($concern, $request->user(), $assigneeId ? User::findOrFail($assigneeId) : null);

        return ConcernController::detail($concern);
    }
}
