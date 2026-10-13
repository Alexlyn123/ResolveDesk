<?php

namespace App\Http\Controllers\Api;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\MemberResource;
use App\Models\Concern;
use App\Models\Membership;
use App\Models\User;
use App\Services\ConcernService;
use App\Services\OrganizationService;
use App\Support\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MemberController extends Controller
{
    public function __construct(private OrganizationContext $context) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Membership::class);

        $filters = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'role' => ['sometimes', 'nullable', Rule::enum(MemberRole::class)],
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:50'],
        ]);

        $members = Membership::query()
            ->where('organization_id', $this->context->organization()->id)
            ->with('user')
            ->when($filters['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($filters['search'] ?? null, function ($query, $search) {
                $like = '%'.addcslashes($search, '%_\\').'%';
                $query->whereHas('user', fn ($users) => $users->where('name', 'like', $like)->orWhere('email', 'like', $like));
            })
            ->orderByRaw("CASE role WHEN 'admin' THEN 1 WHEN 'staff' THEN 2 ELSE 3 END")
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 20);

        return MemberResource::collection($members);
    }

    public function assignable(): JsonResponse
    {
        Gate::authorize('viewAssignable', Membership::class);

        $people = User::query()
            ->whereIn('id', Membership::where('organization_id', $this->context->organization()->id)
                ->where('status', MembershipStatus::Active)
                ->whereIn('role', [MemberRole::Staff, MemberRole::Admin])
                ->select('user_id'))
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['data' => $people]);
    }

    public function store(Request $request, OrganizationService $organizations): JsonResponse
    {
        Gate::authorize('create', Membership::class);

        $data = $request->validate([
            'email' => ['required', 'string', 'email'],
            'role' => ['required', Rule::enum(MemberRole::class)],
        ]);

        $user = User::where('email', strtolower($data['email']))->first()
            ?? throw ValidationException::withMessages([
                'email' => 'No ResolveDesk account uses this email address. Ask them to register first.',
            ]);

        $organization = $this->context->organization();

        if (Membership::where('organization_id', $organization->id)->where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['email' => 'This person is already a member of the workspace.']);
        }

        $membership = $organizations->addMember($organization, $user, MemberRole::from($data['role']));

        return (new MemberResource($membership->load('user')))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(Request $request, Membership $membership): MemberResource
    {
        Gate::authorize('update', $membership);

        $data = $request->validate([
            'role' => ['sometimes', 'required', Rule::enum(MemberRole::class)],
            'status' => ['sometimes', 'required', Rule::enum(MembershipStatus::class)],
        ]);

        $membership->forceFill($data)->save();

        if (! $membership->isTeam() || $membership->status !== MembershipStatus::Active) {
            $this->releaseAssignments($membership, $request->user());
        }

        return new MemberResource($membership->load('user'));
    }

    public function destroy(Request $request, Membership $membership): Response
    {
        Gate::authorize('delete', $membership);

        $this->releaseAssignments($membership, $request->user());
        $membership->delete();

        return response()->noContent();
    }

    private function releaseAssignments(Membership $membership, User $actor): void
    {
        $concerns = app(ConcernService::class);

        Concern::where('organization_id', $membership->organization_id)
            ->where('assigned_to', $membership->user_id)
            ->active()
            ->with('assignee')
            ->get()
            ->each(fn (Concern $concern) => $concerns->assign($concern, $actor, null));
    }
}
