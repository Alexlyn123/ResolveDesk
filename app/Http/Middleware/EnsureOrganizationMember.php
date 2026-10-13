<?php

namespace App\Http\Middleware;

use App\Support\OrganizationContext;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationMember
{
    public function __construct(private OrganizationContext $context) {}

    public function handle(Request $request, Closure $next): Response
    {
        $membership = $request->user()?->resolveCurrentMembership();

        if (! $membership) {
            $this->context->clear();

            return response()->json([
                'message' => 'You are not an active member of any workspace yet.',
                'code' => 'no_organization',
            ], Response::HTTP_FORBIDDEN);
        }

        $this->context->set($membership->organization, $membership);

        return $next($request);
    }
}
