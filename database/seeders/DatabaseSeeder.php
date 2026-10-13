<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // These seeders create accounts with a published password.
        if (app()->isProduction()) {
            throw new RuntimeException('Seeders must not be run in production.');
        }

        $this->call(StarterSeeder::class);
    }
}
