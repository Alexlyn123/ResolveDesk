<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class TicketReferenceGenerator
{
    public function next(): string
    {
        $year = (int) now()->format('Y');

        $number = DB::transaction(function () use ($year) {
            DB::table('ticket_sequences')->insertOrIgnore(['year' => $year, 'last_number' => 0]);

            $last = (int) DB::table('ticket_sequences')
                ->where('year', $year)
                ->lockForUpdate()
                ->value('last_number');

            DB::table('ticket_sequences')->where('year', $year)->update(['last_number' => $last + 1]);

            return $last + 1;
        });

        return sprintf('%s-%d-%06d', config('resolvedesk.ticket_prefix'), $year, $number);
    }
}
