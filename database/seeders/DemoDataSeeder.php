<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class DemoDataSeeder extends Seeder
{
    // Pusat koordinat demo (area Jember, Jawa Timur) — geser random di sekitar sini
    private float $centerLat = -8.1844;
    private float $centerLng = 113.6681;

    public function run(): void
    {
        DB::transaction(function () {
            $packages = $this->seedPackages();
            $mikrotikRouterId = $this->seedMikrotikRouter();
            $odpIds = $this->seedOdps();
            $customerIds = $this->seedCustomers(40);
            $subscriptions = $this->seedSubscriptions($customerIds, $packages, $odpIds, $mikrotikRouterId);
            $this->seedInvoicesAndPayments($subscriptions, $packages);
            $this->seedDevices($subscriptions);
            $this->seedTickets($customerIds, $subscriptions);
            $this->seedVouchers();
            $this->seedCableRoutes($subscriptions, $odpIds);
        });

        $this->command->info('Demo data selesai dibuat.');
    }

    private function randOffset(): float
    {
        // Geser sekitar +-0.03 derajat (~kurang lebih 3km) biar nyebar tapi masih masuk akal
        return (mt_rand(-300, 300) / 10000);
    }

    private function seedPackages(): array
    {
        $tiers = [
            ['name' => 'Home 10 Mbps', 'speed_mbps' => 10, 'price' => 100000, 'mikrotik_profile_name' => 'PKG-10M'],
            ['name' => 'Home 20 Mbps', 'speed_mbps' => 20, 'price' => 150000, 'mikrotik_profile_name' => 'PKG-20M'],
            ['name' => 'Home 35 Mbps', 'speed_mbps' => 35, 'price' => 220000, 'mikrotik_profile_name' => 'PKG-35M'],
            ['name' => 'Business 50 Mbps', 'speed_mbps' => 50, 'price' => 350000, 'mikrotik_profile_name' => 'PKG-50M'],
        ];

        $ids = [];
        foreach ($tiers as $tier) {
            $ids[] = DB::table('packages')->insertGetId([
                ...$tier,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $ids;
    }

    private function seedMikrotikRouter(): int
    {
        return DB::table('mikrotik_routers')->insertGetId([
            'name' => 'Router Utama RW03',
            'host' => '192.168.88.1',
            'api_port' => 8728,
            'username' => 'admin',
            'password' => encrypt('demo-password'),
            'is_active' => true,
            'notes' => 'Data demo, belum terhubung ke perangkat asli',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function seedOdps(): array
    {
        $names = ['ODP-RW01-01', 'ODP-RW01-02', 'ODP-RW02-01', 'ODP-RW02-02', 'ODP-RW03-02', 'ODP-RW04-01', 'ODP-RW04-02'];

        $ids = [];
        foreach ($names as $name) {
            $ids[] = DB::table('odps')->insertGetId([
                'name' => $name,
                'location_lat' => $this->centerLat + $this->randOffset(),
                'location_lng' => $this->centerLng + $this->randOffset(),
                'total_ports' => collect([8, 16])->random(),
                'installed_at' => now()->subMonths(mt_rand(3, 18))->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $ids;
    }

    private function seedCustomers(int $count): array
    {
        $firstNames = ['Budi', 'Siti', 'Agus', 'Dewi', 'Ahmad', 'Rina', 'Joko', 'Wati', 'Eko', 'Sri', 'Hendra', 'Yuni', 'Bambang', 'Fitri', 'Rudi', 'Nur', 'Slamet', 'Indah', 'Anton', 'Lestari'];
        $lastNames = ['Santoso', 'Wijaya', 'Kurniawan', 'Saputra', 'Setiawan', 'Purnama', 'Hidayat', 'Susanto', 'Rahman', 'Wibowo'];

        $statuses = ['active', 'active', 'active', 'active', 'active', 'active', 'active', 'isolir', 'isolir', 'inactive'];

        $ids = [];
        for ($i = 0; $i < $count; $i++) {
            $joinedAt = now()->subMonths(mt_rand(0, 11))->subDays(mt_rand(0, 28));
            $name = $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)];

            $ids[] = DB::table('customers')->insertGetId([
                'name' => $name,
                'phone' => '08' . mt_rand(1000000000, 9999999999),
                'email' => strtolower(str_replace(' ', '.', $name)) . $i . '@mail.test',
                'address' => 'Jl. Contoh No. ' . mt_rand(1, 200) . ', RT ' . mt_rand(1, 9) . '/RW ' . mt_rand(1, 6),
                'coordinate_lat' => $this->centerLat + $this->randOffset(),
                'coordinate_lng' => $this->centerLng + $this->randOffset(),
                'status' => $statuses[array_rand($statuses)],
                'joined_at' => $joinedAt->toDateString(),
                'created_at' => $joinedAt,
                'updated_at' => now(),
            ]);
        }

        return $ids;
    }

    private function seedSubscriptions(array $customerIds, array $packageIds, array $odpIds, int $mikrotikRouterId): array
    {
        $subscriptions = [];
        $portCounters = array_fill_keys($odpIds, 1);

        foreach ($customerIds as $i => $customerId) {
            $customer = DB::table('customers')->find($customerId);
            $odpId = $odpIds[array_rand($odpIds)];
            $portNumber = $portCounters[$odpId]++;

            // 'terminated' sesuai CHECK constraint DB (bukan 'ended')
            $status = match ($customer->status) {
                'isolir' => 'isolir',
                'inactive' => 'terminated',
                default => 'active',
            };

            $packageId = $packageIds[array_rand($packageIds)];

            $subId = DB::table('subscriptions')->insertGetId([
                'customer_id' => $customerId,
                'package_id' => $packageId,
                'odp_id' => $odpId,
                'port_number' => $portNumber,
                'pppoe_username' => 'pppoe' . str_pad((string) $customerId, 4, '0', STR_PAD_LEFT),
                'pppoe_password' => 'pw' . mt_rand(10000, 99999),
                'billing_due_date' => mt_rand(1, 28),
                'status' => $status,
                'started_at' => $customer->joined_at,
                'ended_at' => $status === 'terminated' ? now()->subDays(mt_rand(1, 60))->toDateString() : null,
                'mikrotik_router_id' => $mikrotikRouterId,
                'created_at' => $customer->joined_at,
                'updated_at' => now(),
            ]);

            $subscriptions[] = [
                'id' => $subId,
                'customer_id' => $customerId,
                'package_id' => $packageId,
                'odp_id' => $odpId,
                'started_at' => $customer->joined_at,
                'status' => $status,
            ];
        }

        return $subscriptions;
    }

    private function seedInvoicesAndPayments(array $subscriptions, array $packageIds): void
    {
        $invoiceCounter = 1;

        foreach ($subscriptions as $sub) {
            $price = DB::table('packages')->where('id', $sub['package_id'])->value('price');
            $start = Carbon::parse($sub['started_at'])->startOfMonth();
            $monthsElapsed = $start->diffInMonths(now()) + 1;
            $monthsToGenerate = min($monthsElapsed, 12);

            for ($m = $monthsToGenerate - 1; $m >= 0; $m--) {
                $period = now()->subMonths($m)->startOfMonth();
                $dueDate = $period->copy()->addDays(9);
                $isCurrentMonth = $m === 0;

                // Bulan lalu: 90% lunas. Bulan berjalan: 40% lunas, sisanya belum/telat.
                $isPaid = $isCurrentMonth ? (mt_rand(1, 100) <= 40) : (mt_rand(1, 100) <= 90);
                $isOverdue = ! $isPaid && $dueDate->isPast();

                $invoiceNumber = 'INV-' . $period->format('Ym') . '-' . str_pad((string) $invoiceCounter++, 5, '0', STR_PAD_LEFT);

                $invoiceId = DB::table('invoices')->insertGetId([
                    'customer_id' => $sub['customer_id'],
                    'subscription_id' => $sub['id'],
                    'voucher_id' => null,
                    'invoice_number' => $invoiceNumber,
                    'type' => 'monthly', // sesuai CHECK constraint DB (bukan 'subscription')
                    'period_month' => $period->toDateString(),
                    'amount' => $price,
                    'discount_amount' => 0,
                    'due_date' => $dueDate->toDateString(),
                    'status' => $isPaid ? 'paid' : ($isOverdue ? 'overdue' : 'unpaid'),
                    'paid_at' => $isPaid ? $dueDate->copy()->subDays(mt_rand(0, 5)) : null,
                    'created_at' => $period,
                    'updated_at' => now(),
                ]);

                if ($isPaid) {
                    DB::table('payments')->insert([
                        'invoice_id' => $invoiceId,
                        // sesuai CHECK constraint DB: midtrans, xendit, manual, other (bukan 'qris'/'transfer')
                        'gateway' => collect(['manual', 'manual', 'midtrans'])->random(),
                        'gateway_transaction_id' => 'TRX' . strtoupper(bin2hex(random_bytes(4))),
                        'method' => collect(['cash', 'qris', 'bank_transfer'])->random(),
                        'amount' => $price,
                        'status' => 'success',
                        'paid_at' => $dueDate->copy()->subDays(mt_rand(0, 5)),
                        'raw_payload' => json_encode(['note' => 'demo seed']),
                        'created_at' => now(),
                    ]);
                }
            }
        }
    }

    private function seedDevices(array $subscriptions): void
    {
        foreach ($subscriptions as $sub) {
            if ($sub['status'] === 'terminated') {
                continue;
            }

            $statusRoll = mt_rand(1, 100);
            $lastStatus = $statusRoll <= 80 ? 'online' : ($statusRoll <= 95 ? 'offline' : 'unknown');

            DB::table('devices')->insert([
                'customer_id' => $sub['customer_id'],
                'genieacs_device_id' => 'GA-' . $sub['customer_id'] . '-' . strtoupper(bin2hex(random_bytes(3))),
                'serial_number' => 'SN' . mt_rand(100000, 999999),
                'brand_model' => collect(['Huawei HG8245H', 'ZTE F609', 'Fiberhome AN5506'])->random(),
                'last_inform_at' => $lastStatus === 'online' ? now()->subMinutes(mt_rand(1, 30)) : now()->subHours(mt_rand(2, 48)),
                'last_status' => $lastStatus,
                'rx_power' => round(-mt_rand(150, 280) / 10, 1),
                'ssid' => 'WIFI-' . mt_rand(1000, 9999),
                'updated_at' => now(),
            ]);
        }
    }

    private function seedTickets(array $customerIds, array $subscriptions): void
    {
        $subjects = [
            'Internet lambat sejak semalam',
            'Wifi tidak bisa connect',
            'Lampu ONT merah',
            'Mau upgrade paket',
            'Tagihan double, minta dicek',
            'Internet mati total',
        ];

        $sample = collect($customerIds)->random(10);

        foreach ($sample as $customerId) {
            $sub = collect($subscriptions)->firstWhere('customer_id', $customerId);
            $status = collect(['open', 'in_progress', 'resolved', 'closed'])->random();
            $createdAt = now()->subDays(mt_rand(0, 30));

            $ticketId = DB::table('tickets')->insertGetId([
                'customer_id' => $customerId,
                'subscription_id' => $sub['id'] ?? null,
                'subject' => $subjects[array_rand($subjects)],
                'description' => 'Keluhan demo dari pelanggan, dibuat otomatis via seeder.',
                'status' => $status,
                'priority' => collect(['low', 'medium', 'high'])->random(),
                'assigned_to' => null,
                'created_at' => $createdAt,
                'resolved_at' => in_array($status, ['resolved', 'closed']) ? $createdAt->copy()->addHours(mt_rand(1, 48)) : null,
            ]);

            DB::table('ticket_replies')->insert([
                'ticket_id' => $ticketId,
                'user_id' => null,
                'message' => 'Baik kak, akan kami cek dan tindak lanjuti secepatnya.',
                'created_at' => $createdAt->copy()->addMinutes(mt_rand(10, 120)),
            ]);
        }
    }

    private function seedVouchers(): void
    {
        $vouchers = [
            ['code' => 'PROMO10', 'type' => 'percentage', 'value' => 10, 'applies_to' => 'monthly'],
            ['code' => 'GRATISPASANG', 'type' => 'fixed', 'value' => 150000, 'applies_to' => 'installation'],
            ['code' => 'RAMADAN25', 'type' => 'percentage', 'value' => 25, 'applies_to' => 'all'],
        ];

        foreach ($vouchers as $v) {
            DB::table('vouchers')->insert([
                ...$v,
                'valid_from' => now()->subMonths(1)->toDateString(),
                'valid_until' => now()->addMonths(2)->toDateString(),
                'max_usage' => 100,
                'used_count' => mt_rand(0, 20),
                'created_at' => now(),
            ]);
        }
    }

    private function seedCableRoutes(array $subscriptions, array $odpIds): void
    {
        $odpCoords = DB::table('odps')->whereIn('id', $odpIds)->get()->keyBy('id');

        $sample = collect($subscriptions)->random(min(15, count($subscriptions)));

        foreach ($sample as $sub) {
            $odp = $odpCoords[$sub['odp_id']] ?? null;
            $customer = DB::table('customers')->find($sub['customer_id']);

            if (! $odp || ! $customer || ! $customer->coordinate_lat) {
                continue;
            }

            DB::table('cable_routes')->insert([
                'name' => 'Kabel ke ' . $customer->name,
                'odp_id' => $odp->id,
                'customer_id' => $customer->id,
                'path' => json_encode([
                    ['lat' => (float) $odp->location_lat, 'lng' => (float) $odp->location_lng],
                    ['lat' => (float) $customer->coordinate_lat, 'lng' => (float) $customer->coordinate_lng],
                ]),
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}