<?php

namespace App\Filament\Pages;

use App\Models\CableRoute;
use App\Models\Customer;
use App\Models\Odp;
use Filament\Pages\Page;
use Illuminate\Support\Facades\Validator;
use UnitEnum;
use BackedEnum;

class NetworkMap extends Page
{
    protected string $view = 'filament.pages.network-map';

    protected static string|BackedEnum|null $navigationIcon = 'heroicon-o-map';

    protected static string|UnitEnum|null $navigationGroup = 'Jaringan';

    protected static ?string $navigationLabel = 'Peta Jaringan';

    protected static ?string $title = 'Peta Jaringan';

    public array $odps = [];

    public array $customers = [];

    public array $cableRoutes = [];

    public function mount(): void
    {
        $this->odps = Odp::query()
            ->whereNotNull('location_lat')
            ->whereNotNull('location_lng')
            ->get(['id', 'name', 'location_lat', 'location_lng'])
            ->map(fn (Odp $odp) => [
                'id' => $odp->id,
                'name' => $odp->name,
                'lat' => (float) $odp->location_lat,
                'lng' => (float) $odp->location_lng,
            ])
            ->toArray();

        $this->customers = Customer::query()
            ->whereNotNull('coordinate_lat')
            ->whereNotNull('coordinate_lng')
            ->get(['id', 'name', 'status', 'coordinate_lat', 'coordinate_lng'])
            ->map(fn (Customer $customer) => [
                'id' => $customer->id,
                'name' => $customer->name,
                'status' => $customer->status,
                'lat' => (float) $customer->coordinate_lat,
                'lng' => (float) $customer->coordinate_lng,
            ])
            ->toArray();

        $this->loadCableRoutes();
    }

    protected function loadCableRoutes(): void
    {
        $this->cableRoutes = CableRoute::query()
            ->with(['odp:id,name', 'customer:id,name'])
            ->get()
            ->map(fn (CableRoute $route) => [
                'id' => $route->id,
                'name' => $route->name,
                'status' => $route->status,
                'path' => $route->path,
                'odp_name' => $route->odp?->name,
                'customer_name' => $route->customer?->name,
            ])
            ->toArray();
    }

    public function saveCableRoute(array $latlngs, ?string $name, ?int $odpId, ?int $customerId): void
    {
        $validator = Validator::make(
            ['name' => $name, 'odp_id' => $odpId, 'customer_id' => $customerId],
            [
                'name' => ['nullable', 'string', 'max:100'],
                'odp_id' => ['nullable', 'exists:odps,id'],
                'customer_id' => ['nullable', 'exists:customers,id'],
            ]
        );
        $validator->validate();

        CableRoute::create([
            'name' => $name,
            'odp_id' => $odpId,
            'customer_id' => $customerId,
            'path' => $latlngs,
            'status' => 'active',
        ]);

        $this->loadCableRoutes();

        \Filament\Notifications\Notification::make()
            ->title('Jalur kabel disimpan')
            ->success()
            ->send();
    }

    public function updateCableRoutePath(int $id, array $latlngs): void
    {
        CableRoute::whereKey($id)->update(['path' => $latlngs]);
        $this->loadCableRoutes();
    }

    public function deleteCableRoute(int $id): void
    {
        CableRoute::whereKey($id)->delete();
        $this->loadCableRoutes();

        \Filament\Notifications\Notification::make()
            ->title('Jalur kabel dihapus')
            ->success()
            ->send();
    }
}