<?php

namespace App\Http\Controllers\Api;

use App\Enums\MemberRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\SessionResource;
use App\Models\Organization;
use App\Models\User;
use App\Services\OrganizationService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function user(Request $request): SessionResource
    {
        return new SessionResource($request->user());
    }

    public function register(RegisterRequest $request, OrganizationService $organizations): JsonResponse
    {
        $data = $request->validated();

        $organization = $this->organizationToJoin($data['workspace_code'] ?? null, $organizations);

        $user = DB::transaction(function () use ($data, $organization, $organizations) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'], // hashed by the model cast
            ]);

            if ($organization) {
                // Self-registration can only ever produce a customer.
                $organizations->addMember($organization, $user, MemberRole::Customer);
                $user->forceFill(['current_organization_id' => $organization->id])->save();
            }

            return $user;
        });

        event(new Registered($user));

        Auth::guard('web')->login($user);
        $this->regenerateSession($request);

        return (new SessionResource($user))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function login(LoginRequest $request): SessionResource
    {
        $request->authenticate();
        $this->regenerateSession($request);

        return new SessionResource(Auth::guard('web')->user());
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }

    private function organizationToJoin(?string $code, OrganizationService $organizations): ?Organization
    {
        if (filled($code)) {
            return $organizations->findByJoinCode($code)
                ?? throw ValidationException::withMessages([
                    'workspace_code' => 'This workspace code is not recognised.',
                ]);
        }

        $default = config('resolvedesk.default_organization_slug');

        return $default
            ? Organization::where('slug', $default)->where('status', 'active')->first()
            : null;
    }

    private function regenerateSession(Request $request): void
    {
        if ($request->hasSession()) {
            $request->session()->regenerate();
        }
    }
}
