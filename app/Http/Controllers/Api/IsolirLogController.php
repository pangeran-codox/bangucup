<?php

namespace App\Http\Controllers\Api;

use App\Http\Resources\IsolirLogResource;
use App\Models\IsolirLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IsolirLogController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = IsolirLog::with(['subscription.customer', 'admin']);

        if ($request->filled('subscription_id')) {
            $query->where('subscription_id', $request->subscription_id);
        }

        if ($request->filled('action')) {
            $query->where('action', $request->action);
        }

        if ($request->filled('triggered_by')) {
            $query->where('triggered_by', $request->triggered_by);
        }

        $logs = $query
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return $this->success([
            'data' => IsolirLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ],
        ]);
    }

    public function show(IsolirLog $isolirLog): JsonResponse
    {
        $isolirLog->load(['subscription.customer', 'admin']);

        return $this->success(new IsolirLogResource($isolirLog));
    }
}
