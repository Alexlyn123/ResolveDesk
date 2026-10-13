<?php

namespace App\Enums;

enum ConcernPriority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return ucfirst($this->value);
    }

    public function rank(): int
    {
        return match ($this) {
            self::Low => 1,
            self::Medium => 2,
            self::High => 3,
            self::Urgent => 4,
        };
    }

    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    public static function rankSql(string $column = 'priority'): string
    {
        return "CASE {$column} WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END";
    }
}
