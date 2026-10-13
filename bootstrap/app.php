<?php

use App\Http\Middleware\EnsureOrganizationMember;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Sanctum first-party SPA authentication: session cookie + CSRF on /api.
        $middleware->statefulApi();
        $middleware->throttleApi();

        $middleware->append(SecurityHeaders::class);

        $middleware->alias([
            'organization' => EnsureOrganizationMember::class,
        ]);

        // The SPA owns /login, so there is no named Laravel "login" route.
        $middleware->redirectGuestsTo('/login');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every /api response is JSON, including errors.
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );
    })->create();
