<?php

namespace App\Providers;

use App\Support\OrganizationContext;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // One workspace context per request.
        $this->app->scoped(OrganizationContext::class);
    }

    public function boot(): void
    {
        // Surface N+1 queries and silently dropped attributes during development.
        Model::shouldBeStrict(! $this->app->isProduction());

        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        JsonResource::wrap('data');

        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(180)
            ->by($request->user()?->id ?: $request->ip()));

        // Sign-in, registration, password changes, and workspace-code attempts.
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        // Creating concerns, comments, and status changes.
        RateLimiter::for('writes', fn (Request $request) => Limit::perMinute(40)
            ->by($request->user()?->id ?: $request->ip()));
    }
}
