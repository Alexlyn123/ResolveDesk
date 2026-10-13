<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;
use App\Support\OrganizationContext;
use Illuminate\Auth\Access\Response;

class CategoryPolicy
{
    public function __construct(private OrganizationContext $context) {}

    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Category $category): Response
    {
        return $this->context->membershipFor($user, $category->organization_id)
            ? Response::allow()
            : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return $this->context->membership()->isAdmin();
    }

    public function update(User $user, Category $category): Response
    {
        return $this->manage($user, $category);
    }

    public function delete(User $user, Category $category): Response
    {
        return $this->manage($user, $category);
    }

    private function manage(User $user, Category $category): Response
    {
        $membership = $this->context->membershipFor($user, $category->organization_id);

        if (! $membership) {
            return Response::denyAsNotFound();
        }

        return $membership->isAdmin()
            ? Response::allow()
            : Response::deny('Only organization administrators can manage categories.');
    }
}
