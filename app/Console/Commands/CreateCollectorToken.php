<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class CreateCollectorToken extends Command
{
    protected $signature = 'collector:token {--email=collector@bangucup.local : Email akun layanan collector}';

    protected $description = 'Buat (atau putar ulang) token khusus untuk mikrotik-collector dengan ability terbatas';

    public function handle(): int
    {
        $email = (string) $this->option('email');

        // Akun layanan khusus, tanpa role, jadi tidak bisa memakai endpoint lain.
        $user = User::firstOrCreate(
            ['email' => $email],
            ['name' => 'Collector Service', 'password' => Str::random(64)]
        );

        $user->syncRoles([]);

        // Cabut token lama supaya hanya ada satu token collector aktif.
        $user->tokens()->delete();

        $token = $user->createToken('collector', ['routers:collect'])->plainTextToken;

        $this->info('Token collector baru (simpan di COLLECTOR_API_TOKEN, hanya ditampilkan sekali):');
        $this->line($token);
        $this->newLine();
        $this->warn('Restart container collector setelah mengisi token.');

        return self::SUCCESS;
    }
}
