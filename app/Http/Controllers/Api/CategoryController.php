<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Support\OrganizationContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function __construct(private OrganizationContext $context) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Category::class);

        $isAdmin = $this->context->membership()->isAdmin();

        $categories = $this->context->organization()->categories()
            // Retired categories are only listed for the administrators who manage them.
            ->when(! $isAdmin || ! $request->boolean('include_inactive'), fn ($query) => $query->where('is_active', true))
            ->when($isAdmin, fn ($query) => $query->withCount('concerns'))
            ->orderBy('name')
            ->get();

        return CategoryResource::collection($categories);
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Category::class);

        $category = new Category($request->validate($this->rules()));
        $category->organization_id = $this->context->organization()->id;
        $category->save();

        return (new CategoryResource($category))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Category $category): CategoryResource
    {
        Gate::authorize('view', $category);

        return new CategoryResource($category);
    }

    public function update(Request $request, Category $category): CategoryResource
    {
        Gate::authorize('update', $category);

        $category->update($request->validate($this->rules($category)));

        return new CategoryResource($category);
    }

    public function destroy(Category $category): JsonResponse|Response
    {
        Gate::authorize('delete', $category);

        // Concerns keep their category for the record, so a used category is retired, not removed.
        if ($category->concerns()->withTrashed()->exists()) {
            return response()->json([
                'message' => 'This category is used by existing concerns. Deactivate it instead so their records stay intact.',
            ], Response::HTTP_CONFLICT);
        }

        $category->delete();

        return response()->noContent();
    }

    private function rules(?Category $category = null): array
    {
        $unique = Rule::unique('categories', 'name')
            ->where('organization_id', $this->context->organization()->id)
            ->ignore($category?->id);

        return [
            'name' => [$category ? 'sometimes' : 'required', 'required', 'string', 'min:2', 'max:80', $unique],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
