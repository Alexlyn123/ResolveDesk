<?php

namespace App\Enums;

enum ConcernStatus: string
{
    case Open = 'open';
    case UnderReview = 'under_review';
    case InProgress = 'in_progress';
    case WaitingForCustomer = 'waiting_for_customer';
    case Resolved = 'resolved';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Open',
            self::UnderReview => 'Under review',
            self::InProgress => 'In progress',
            self::WaitingForCustomer => 'Waiting for customer',
            self::Resolved => 'Resolved',
            self::Closed => 'Closed',
        };
    }

    public static function active(): array
    {
        return [self::Open, self::UnderReview, self::InProgress, self::WaitingForCustomer];
    }

    public static function activeValues(): array
    {
        return array_map(fn (self $status) => $status->value, self::active());
    }

    public function isActive(): bool
    {
        return in_array($this, self::active(), true);
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
