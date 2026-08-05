<x-filament-panels::page>
    <div
        x-data="networkMap({
            odps: @js($odps),
            customers: @js($customers),
            cableRoutes: @js($cableRoutes),
        })"
        x-init="init($wire)"
        wire:ignore
        class="nm-layout"
    >
        <div class="nm-map-wrap">
            <div id="network-map-canvas"></div>
        </div>

        <div class="nm-sidebar">
            <div class="nm-card">
                <h3 class="nm-card-title">Legenda</h3>
                <div class="nm-legend-row"><span class="nm-dot" style="background:#3b82f6"></span> ODP</div>
                <div class="nm-legend-row"><span class="nm-dot" style="background:#22c55e"></span> Pelanggan aktif</div>
                <div class="nm-legend-row"><span class="nm-dot" style="background:#f97316"></span> Pelanggan isolir</div>
                <div class="nm-legend-row"><span class="nm-dot" style="background:#9ca3af"></span> Pelanggan lain</div>
                <div class="nm-legend-row"><span class="nm-line"></span> Jalur kabel</div>
                <p class="nm-hint">Klik ikon garis di pojok kiri atas peta buat mulai gambar jalur kabel. Klik titik demi titik ngikutin rute, dobel-klik buat selesai.</p>
            </div>

            <div class="nm-card nm-card-accent" x-show="pendingPath" x-cloak>
                <h3 class="nm-card-title">Simpan jalur kabel baru</h3>

                <label class="nm-label">Nama jalur (opsional)</label>
                <input type="text" x-model="form.name" class="nm-input" placeholder="Misal: Kabel utama RW03">

                <label class="nm-label">Hubungkan ke ODP (opsional)</label>
                <select x-model="form.odpId" class="nm-input">
                    <option value="">- Tidak ada -</option>
                    <template x-for="odp in odps" :key="odp.id">
                        <option :value="odp.id" x-text="odp.name"></option>
                    </template>
                </select>

                <label class="nm-label">Hubungkan ke pelanggan (opsional)</label>
                <select x-model="form.customerId" class="nm-input">
                    <option value="">- Tidak ada -</option>
                    <template x-for="c in customers" :key="c.id">
                        <option :value="c.id" x-text="c.name"></option>
                    </template>
                </select>

                <div class="nm-btn-row">
                    <button type="button" @click="confirmSave()" class="nm-btn nm-btn-primary">Simpan</button>
                    <button type="button" @click="discardPending()" class="nm-btn nm-btn-ghost">Batal</button>
                </div>
            </div>

            <div class="nm-card">
                <h3 class="nm-card-title">Ringkasan</h3>
                <div class="nm-stat-row"><span>ODP</span><b x-text="odps.length"></b></div>
                <div class="nm-stat-row"><span>Pelanggan bertitik</span><b x-text="customers.length"></b></div>
                <div class="nm-stat-row"><span>Jalur kabel</span><b x-text="cableRoutes.length"></b></div>
            </div>
        </div>
    </div>

    @assets
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script src="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
    @endassets

    <style>
        .nm-layout {
            display: flex;
            gap: 1rem;
            align-items: flex-start;
            flex-wrap: wrap;
        }

        .nm-map-wrap {
            flex: 1 1 640px;
            min-width: 320px;
            border-radius: 0.75rem;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.08);
        }

        #network-map-canvas {
            height: 680px;
            width: 100%;
        }

        .nm-sidebar {
            flex: 0 0 300px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .nm-card {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 0.75rem;
            padding: 1rem;
        }

        .nm-card-accent {
            border-color: #f59e0b;
            background: rgba(245,158,11,0.06);
        }

        .nm-card-title {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: #9ca3af;
            margin: 0 0 0.75rem 0;
        }

        .nm-legend-row {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: #e5e7eb;
            padding: 0.2rem 0;
        }

        .nm-dot {
            width: 0.65rem;
            height: 0.65rem;
            border-radius: 999px;
            flex-shrink: 0;
        }

        .nm-line {
            width: 1.1rem;
            height: 0.2rem;
            background: #2563eb;
            border-radius: 999px;
            flex-shrink: 0;
        }

        .nm-hint {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 0.6rem;
            line-height: 1.4;
        }

        .nm-label {
            display: block;
            font-size: 0.75rem;
            font-weight: 500;
            color: #9ca3af;
            margin: 0.6rem 0 0.25rem;
        }

        .nm-input {
            width: 100%;
            box-sizing: border-box;
            border-radius: 0.5rem;
            border: 1px solid rgba(255,255,255,0.15);
            background: rgba(0,0,0,0.25);
            color: #f3f4f6;
            font-size: 0.875rem;
            padding: 0.45rem 0.6rem;
        }

        .nm-btn-row {
            display: flex;
            gap: 0.5rem;
            margin-top: 1rem;
        }

        .nm-btn {
            flex: 1;
            border-radius: 0.5rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid transparent;
        }

        .nm-btn-primary {
            background: #f59e0b;
            color: #1c1917;
        }

        .nm-btn-primary:hover {
            background: #fbbf24;
        }

        .nm-btn-ghost {
            background: transparent;
            border-color: rgba(255,255,255,0.2);
            color: #e5e7eb;
        }

        .nm-btn-ghost:hover {
            background: rgba(255,255,255,0.06);
        }

        .nm-stat-row {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            color: #d1d5db;
            padding: 0.25rem 0;
        }

        @media (max-width: 1024px) {
            .nm-sidebar {
                flex-basis: 100%;
            }
        }
    </style>

    <script>
        function networkMap({ odps, customers, cableRoutes }) {
            return {
                odps,
                customers,
                cableRoutes,
                pendingPath: null,
                pendingLayer: null,
                form: { name: '', odpId: '', customerId: '' },
                map: null,
                drawnItems: null,
                wire: null,

                init(wire) {
                    this.wire = wire;
                    this.$nextTick(() => this.setupMap());
                },

                setupMap() {
                    const center = this.odps.length
                        ? [this.odps[0].lat, this.odps[0].lng]
                        : [-2.5, 118.0];

                    this.map = L.map('network-map-canvas').setView(center, this.odps.length ? 15 : 5);

                    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap contributors',
                    }).addTo(this.map);

                    const statusColor = { active: '#22c55e', isolir: '#f97316', inactive: '#9ca3af', pending: '#9ca3af' };

                    this.odps.forEach((odp) => {
                        L.circleMarker([odp.lat, odp.lng], {
                            radius: 8, color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2,
                        }).addTo(this.map).bindPopup(`<b>${odp.name}</b><br>ODP`);
                    });

                    this.customers.forEach((c) => {
                        const color = statusColor[c.status] || '#9ca3af';
                        L.circleMarker([c.lat, c.lng], {
                            radius: 6, color, fillColor: color, fillOpacity: 0.9, weight: 2,
                        }).addTo(this.map).bindPopup(`<b>${c.name}</b><br>Pelanggan (${c.status})`);
                    });

                    this.drawnItems = new L.FeatureGroup();
                    this.map.addLayer(this.drawnItems);

                    this.cableRoutes.forEach((route) => this.addRouteLayer(route));

                    const drawControl = new L.Control.Draw({
                        draw: {
                            polyline: { shapeOptions: { color: '#2563eb', weight: 4 } },
                            polygon: false, rectangle: false, circle: false, circlemarker: false, marker: false,
                        },
                        edit: { featureGroup: this.drawnItems },
                    });
                    this.map.addControl(drawControl);

                    this.map.on(L.Draw.Event.CREATED, (e) => {
                        const layer = e.layer;
                        this.pendingLayer = layer;
                        this.pendingPath = layer.getLatLngs().map((p) => ({ lat: p.lat, lng: p.lng }));
                        this.drawnItems.addLayer(layer);
                    });

                    this.map.on(L.Draw.Event.EDITED, (e) => {
                        e.layers.eachLayer((layer) => {
                            if (layer._routeId) {
                                const latlngs = layer.getLatLngs().map((p) => ({ lat: p.lat, lng: p.lng }));
                                this.wire.updateCableRoutePath(layer._routeId, latlngs);
                            }
                        });
                    });

                    this.map.on(L.Draw.Event.DELETED, (e) => {
                        e.layers.eachLayer((layer) => {
                            if (layer._routeId) {
                                this.wire.deleteCableRoute(layer._routeId);
                            }
                        });
                    });
                },

                addRouteLayer(route) {
                    const latlngs = route.path.map((p) => [p.lat, p.lng]);
                    const layer = L.polyline(latlngs, {
                        color: route.status === 'damaged' ? '#ef4444' : '#2563eb',
                        weight: 4,
                        dashArray: route.status === 'planned' ? '6 6' : null,
                    });
                    layer._routeId = route.id;
                    const label = route.name || 'Jalur kabel';
                    const extra = [route.odp_name, route.customer_name].filter(Boolean).join(' &rarr; ');
                    layer.bindPopup(`<b>${label}</b>${extra ? '<br>' + extra : ''}`);
                    this.drawnItems.addLayer(layer);
                },

                confirmSave() {
                    this.wire.saveCableRoute(
                        this.pendingPath,
                        this.form.name || null,
                        this.form.odpId || null,
                        this.form.customerId || null,
                    ).then((route) => {
                        this.pendingLayer._routeId = route.id;
                        this.cableRoutes.push(route);
                        const label = route.name || 'Jalur kabel';
                        const extra = [route.odp_name, route.customer_name].filter(Boolean).join(' &rarr; ');
                        this.pendingLayer.bindPopup(`<b>${label}</b>${extra ? '<br>' + extra : ''}`);
                        this.resetPendingState();
                    });
                },

                discardPending() {
                    if (this.pendingLayer && !this.pendingLayer._routeId) {
                        this.drawnItems.removeLayer(this.pendingLayer);
                    }
                    this.resetPendingState();
                },

                resetPendingState() {
                    this.pendingPath = null;
                    this.pendingLayer = null;
                    this.form = { name: '', odpId: '', customerId: '' };
                },
            };
        }
    </script>
</x-filament-panels::page>