<?php

namespace App\Http\Controllers\Api;

use App\Enums\ConcernStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Concerns\ChangeStatusRequest;
use App\Http\Resources\ConcernResource;
use App\Models\Concern;
use App\Services\ConcernService;
use App\Support\OrganizationContext;

class ConcernStatusController extends Controller
{
    public function __invoke(
        ChangeStatusRequest $request,
        Concern $concern,
        ConcernService $concerns,
        OrganizationContext $context,
    ): ConcernResource {
        $concern = $concerns->changeStatus(
            $concern,
            $request->user(),
            $context->membership(),
            ConcernStatus::from($request->validated('status')),
            $request->validated('note'),
        );

        return ConcernController::detail($concern);
    }
}
