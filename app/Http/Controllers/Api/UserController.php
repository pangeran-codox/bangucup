<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends ApiController
{
    public function index(): JsonResponse
    {
        $users = User::with('roles')->orderBy('name')->get();

        return $this->success(UserResource::collection($users));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        // Menetapkan role = hak tertinggi. Hanya yang boleh mengubah role.
        if ($request->filled('roles') && ! $request->user()->can('update_roles')) {
            return $this->error('Anda tidak berhak menetapkan role.', 403);
        }

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
        ]);

        if ($request->filled('roles')) {
            $user->syncRoles($request->roles);
        }

        return $this->created(new UserResource($user), 'User berhasil dibuat');
    }

    public function show(User $user): JsonResponse
    {
        $user->load('roles');

        return $this->success(new UserResource($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        if ($denied = $this->denyIfProtected($request, $user)) {
            return $denied;
        }

        $data = $request->validate([
            'name'     => ['sometimes', 'string', 'max:255'],
            'email'    => ['sometimes', 'email', "unique:users,email,{$user->id}"],
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $passwordChanged = ! empty($data['password']);

        if ($passwordChanged) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        // Ganti password = semua sesi lama user itu dicabut (kecuali sesi yang sedang dipakai).
        if ($passwordChanged) {
            $currentId = $user->is($request->user()) ? $request->user()->currentAccessToken()?->id : null;
            $user->tokens()->when($currentId, fn ($q) => $q->where('id', '!=', $currentId))->delete();
        }

        return $this->success(new UserResource($user), 'User berhasil diperbarui');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return $this->error('Tidak bisa menghapus akun sendiri.', 422);
        }

        if ($denied = $this->denyIfProtected($request, $user)) {
            return $denied;
        }

        if ($this->isLastSuperAdmin($user)) {
            return $this->error('Tidak bisa menghapus super_admin terakhir.', 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return $this->noContent();
    }

    public function syncRoles(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'roles'   => ['required', 'array'],
            'roles.*' => ['string', 'exists:roles,name'],
        ]);

        // Jangan sampai sistem kehilangan super_admin terakhir.
        if ($this->isLastSuperAdmin($user) && ! in_array('super_admin', $data['roles'], true)) {
            return $this->error('Tidak bisa mencabut role super_admin dari super_admin terakhir.', 422);
        }

        $user->syncRoles($data['roles']);

        return $this->success(new UserResource($user->load('roles')), 'Role berhasil diperbarui');
    }

    /** Hanya super_admin yang boleh mengubah atau menghapus akun super_admin lain. */
    private function denyIfProtected(Request $request, User $target): ?JsonResponse
    {
        if ($target->hasRole('super_admin') && ! $request->user()->hasRole('super_admin')) {
            return $this->error('Hanya super_admin yang dapat mengubah akun super_admin.', 403);
        }

        return null;
    }

    private function isLastSuperAdmin(User $user): bool
    {
        return $user->hasRole('super_admin')
            && User::role('super_admin')->count() <= 1;
    }
}
