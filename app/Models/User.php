<?php

namespace App\Models;

use App\Enums\MembershipStatus;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /** @var list<string> */
    protected $fillable = [
        'name',
        'email',
        'password',
    ];

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(Membership::class);
    }

    public function currentOrganization(): BelongsTo
    {
        return $this->belongsTo(Organization::class, 'current_organization_id');
    }

    public function activeMemberships(): HasMany
    {
        return $this->memberships()
            ->where('status', MembershipStatus::Active)
            ->whereHas('organization', fn ($query) => $query->where('status', 'active'));
    }

    public function resolveCurrentMembership(): ?Membership
    {
        $membership = null;

        if ($this->current_organization_id) {
            $membership = $this->activeMemberships()
                ->where('organization_id', $this->current_organization_id)
                ->with('organization')
                ->first();
        }

        $membership ??= $this->activeMemberships()->with('organization')->orderBy('id')->first();

        if ($membership && $this->current_organization_id !== $membership->organization_id) {
            $this->forceFill(['current_organization_id' => $membership->organization_id])->saveQuietly();
        }

        return $membership;
    }
}
