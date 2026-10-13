<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrganizationResource;
use App\Http\Resources\SessionResource;
use App\Models\Organization;
use App\Services\OrganizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class OrganizationController extends Controller
{
    public function __construct(private OrganizationService $organizations) {}

    public function index(Request $request): SessionResource
    {
        return new SessionResource($request->user());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->organizations->create($request->user(), $data['name'], $data['description'] ?? null);

        return (new SessionResource($request->user()->refresh()))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function join(Request $request): SessionResource
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:32'],
        ]);

        $this->organizations->joinAsCustomer($request->user(), $data['code']);

        return new SessionResource($request->user()->refresh());
    }

    public function switch(Request $request, Organization $organization): SessionResource
    {
        $user = $request->user();

        // 404, not 403: do not confirm that a workspace the user cannot access exists.
        abort_unless(
            $user->activeMemberships()->where('organization_id', $organization->id)->exists(),
            Response::HTTP_NOT_FOUND,
        );

        $user->forceFill(['current_organization_id' => $organization->id])->save();

        return new SessionResource($user);
    }

    public function show(Organization $organization): OrganizationResource
    {
        Gate::authorize('view', $organization);

        return new OrganizationResource($organization);
    }

    public function update(Request $request, Organization $organization): OrganizationResource
    {
        Gate::authorize('update', $organization);

        $organization->update($request->validate([
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]));

        return new OrganizationResource($organization);
    }

    public function regenerateJoinCode(Organization $organization): OrganizationResource
    {
        Gate::authorize('update', $organization);

        $organization->forceFill(['join_code' => Organization::newJoinCode()])->save();

        return new OrganizationResource($organization);
    }
}
