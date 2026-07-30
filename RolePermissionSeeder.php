<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Modul yang punya permission CRUD standar
        $modules = [
            'customers',
            'subscriptions',
            'packages',
            'invoices',
            'payments',
            'tickets',
            'assets',
            'odps',
            'vouchers',
            'devices',
        ];

        $actions = ['view', 'create', 'update', 'delete'];

        foreach ($modules as $module) {
            foreach ($actions as $action) {
                Permission::firstOrCreate(['name' => "{$action}_{$module}"]);
            }
        }

        // Permission khusus manajemen user & role (cuma buat super_admin)
        foreach (['view', 'create', 'update', 'delete'] as $action) {
            Permission::firstOrCreate(['name' => "{$action}_users"]);
            Permission::firstOrCreate(['name' => "{$action}_roles"]);
        }

        // ===== ROLE: super_admin =====
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin']);
        $superAdmin->syncPermissions(Permission::all());

        // ===== ROLE: admin =====
        // Semua akses operasional, TAPI gak boleh kelola roles/permission orang lain
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $adminPermissions = Permission::whereNotIn('name', [
            'view_roles', 'create_roles', 'update_roles', 'delete_roles',
        ])->get();
        $admin->syncPermissions($adminPermissions);

        // ===== ROLE: staff (CS / admin keuangan) =====
        // Kelola pelanggan, langganan, invoice, pembayaran, tiket — TANPA hapus
        $staff = Role::firstOrCreate(['name' => 'staff']);
        $staffPermissions = Permission::where(function ($query) {
            $query->where('name', 'like', 'view_%')
                ->orWhere('name', 'like', 'create_%')
                ->orWhere('name', 'like', 'update_%');
        })->whereIn('name', array_merge(
            array_map(fn ($a) => "{$a}_customers", ['view', 'create', 'update']),
            array_map(fn ($a) => "{$a}_subscriptions", ['view', 'create', 'update']),
            array_map(fn ($a) => "{$a}_invoices", ['view', 'create', 'update']),
            array_map(fn ($a) => "{$a}_payments", ['view', 'create', 'update']),
            array_map(fn ($a) => "{$a}_tickets", ['view', 'create', 'update']),
            array_map(fn ($a) => "{$a}_vouchers", ['view', 'create', 'update']),
        ))->get();
        $staff->syncPermissions($staffPermissions);

        // ===== ROLE: teknisi =====
        // Fokus kerjaan lapangan: tiket, device, aset, ODP — TANPA data keuangan
        $teknisi = Role::firstOrCreate(['name' => 'teknisi']);
        $teknisiPermissions = Permission::whereIn('name', array_merge(
            array_map(fn ($a) => "{$a}_tickets", ['view', 'update']),
            array_map(fn ($a) => "{$a}_devices", ['view', 'update']),
            array_map(fn ($a) => "{$a}_assets", ['view', 'update']),
            ['view_odps', 'view_subscriptions'],
        ))->get();
        $teknisi->syncPermissions($teknisiPermissions);

        // Assign role super_admin ke user pertama yang terdaftar (biasanya kamu sendiri)
        $firstUser = User::orderBy('id')->first();
        if ($firstUser && ! $firstUser->hasAnyRole(['super_admin', 'admin', 'staff', 'teknisi'])) {
            $firstUser->assignRole('super_admin');
        }
    }
}
