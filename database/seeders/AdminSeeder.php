<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Buat user admin pertama untuk Filament.
     *
     * Dijalankan sekali saat pertama deploy ke production:
     *   php artisan db:seed --class=AdminSeeder
     *
     * Credentials diambil dari environment variable supaya tidak
     * ada password yang di-hardcode di source code.
     *
     * Wajib set di .env (atau docker-compose.swarm.yml):
     *   ADMIN_EMAIL=admin@yourdomain.com
     *   ADMIN_PASSWORD=gantipasswordkuat
     *   ADMIN_NAME=Administrator        (opsional, default "Administrator")
     */
    public function run(): void
    {
        $email    = env('ADMIN_EMAIL', 'admin@bangucup.id');
        $password = env('ADMIN_PASSWORD');
        $name     = env('ADMIN_NAME', 'Administrator');

        if (empty($password)) {
            $this->command->error('ADMIN_PASSWORD tidak di-set di environment!');
            $this->command->error('Jalankan dengan: ADMIN_PASSWORD=xxx php artisan db:seed --class=AdminSeeder');

            return;
        }

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name'              => $name,
                'password'          => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        if ($user->wasRecentlyCreated) {
            $this->command->info("User admin dibuat: {$email}");
        } else {
            $this->command->warn("User {$email} sudah ada, tidak dibuat ulang.");
        }

        // Assign role super_admin (dari RolePermissionSeeder)
        // firstOrCreate supaya aman kalau seeder dijalankan berulang
        if (! $user->hasRole('super_admin')) {
            $user->assignRole('super_admin');
            $this->command->info("Role super_admin di-assign ke {$email}");
        }
    }
}
