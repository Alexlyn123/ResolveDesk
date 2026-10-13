<?php

namespace App\Http\Controllers\Api;

use App\Enums\CommentVisibility;
use App\Http\Controllers\Controller;
use App\Http\Requests\Concerns\StoreCommentRequest;
use App\Http\Resources\CommentResource;
use App\Models\Concern;
use App\Services\ConcernService;
use App\Support\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ConcernCommentController extends Controller
{
    public function __construct(private OrganizationContext $context) {}

    public function index(Concern $concern): AnonymousResourceCollection
    {
        Gate::authorize('view', $concern);

        return CommentResource::collection(
            $concern->comments()
                ->visibleTo($this->context->membership())
                ->with('user:id,name')
                ->oldest()
                ->orderBy('id')
                ->get()
        );
    }

    public function store(StoreCommentRequest $request, Concern $concern, ConcernService $concerns): JsonResponse
    {
        $comment = $concerns->addComment(
            $concern,
            $request->user(),
            $this->context->membership(),
            $request->validated('body'),
            CommentVisibility::from($request->validated('visibility') ?? CommentVisibility::Public->value),
        );

        return (new CommentResource($comment))->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
