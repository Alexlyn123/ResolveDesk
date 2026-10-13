<?php

namespace App\Enums;

enum MemberRole: string
{
    case Customer = 'customer';
    case Staff = 'staff';
    case Admin = 'admin';

    public function label(): string
    {
        return match ($this) {
            self::Customer => 'Customer',
            self::Staff => 'Staff',
            self::Admin => 'Organization administrator',
        };
    }

    public function isTeam(): bool
    {
        return $this !== self::Customer;
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
