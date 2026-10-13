<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ConcernAssignmentController;
use App\Http\Controllers\Api\ConcernCommentController;
use App\Http\Controllers\Api\ConcernController;
use App\Http\Controllers\Api\ConcernStatusController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\MemberController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['guest:web', 'throttle:auth'])->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('user', [AuthController::class, 'user']);
    Route::post('logout', [AuthController::class, 'logout']);

    Route::patch('profile', [ProfileController::class, 'update']);
    Route::put('profile/password', [ProfileController::class, 'updatePassword'])->middleware('throttle:auth');

    // Workspaces the user belongs to. No active workspace is required here.
    Route::get('organizations', [OrganizationController::class, 'index']);
    Route::post('organizations', [OrganizationController::class, 'store'])->middleware('throttle:writes');
    Route::post('organizations/join', [OrganizationController::class, 'join'])->middleware('throttle:auth');
    Route::post('organizations/{organization}/switch', [OrganizationController::class, 'switch']);

    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'read']);

    Route::middleware('organization')->group(function () {
        Route::get('organizations/{organization}', [OrganizationController::class, 'show']);
        Route::patch('organizations/{organization}', [OrganizationController::class, 'update']);
        Route::post('organizations/{organization}/join-code', [OrganizationController::class, 'regenerateJoinCode']);

        Route::get('dashboard', DashboardController::class);
        Route::get('reports/summary', ReportController::class);

        Route::apiResource('categories', CategoryController::class);

        Route::get('members/assignable', [MemberController::class, 'assignable']);
        Route::apiResource('members', MemberController::class)
            ->parameters(['members' => 'membership'])
            ->except('show');

        Route::apiResource('concerns', ConcernController::class)->except(['store']);
        Route::middleware('throttle:writes')->group(function () {
            Route::post('concerns', [ConcernController::class, 'store']);
            Route::post('concerns/{concern}/assign', ConcernAssignmentController::class);
            Route::post('concerns/{concern}/status', ConcernStatusController::class);
            Route::post('concerns/{concern}/comments', [ConcernCommentController::class, 'store']);
        });
        Route::get('concerns/{concern}/comments', [ConcernCommentController::class, 'index']);
    });
});
