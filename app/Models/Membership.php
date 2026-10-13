<?php

namespace App\Models;

use App\Enums\MemberRole;
use App\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Membership extends Model
{
    use HasFactory;

    protected $table = 'organization_user';

    protected $guarded = ['*'];

    protected function casts(): array
    {
        return [
            'role' => MemberRole::class,
            'status' => MembershipStatus::class,
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === MemberRole::Admin;
    }

    public function isStaff(): bool
    {
        return $this->role === MemberRole::Staff;
    }

    public function isCustomer(): bool
    {
        return $this->role === MemberRole::Customer;
    }

    public function isTeam(): bool
    {
        return $this->role->isTeam();
    }
}
