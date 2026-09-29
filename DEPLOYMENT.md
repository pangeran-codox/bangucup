# Bangucup — Panduan Deploy & Troubleshooting Produksi

> Dokumen ini mencatat semua langkah deploy, konfigurasi penting, dan masalah
> yang pernah terjadi beserta solusinya. Update dokumen ini setiap ada perubahan.

---

## 1. Arsitektur Produksi

```
Browser → ucupnet.my.id (Nginx Proxy Manager + SSL)
            │
            ├── http  → bangucup_nginx:80 (port 8085)
            │              │
            │              ├── /api/* → PHP-FPM bangucup_app:9000
            │              └── /*     → public/index.html (React SPA)
            │
            └── /ws (WebSocket) → bangucup_gateway:8081 (port 8087)

bangucup_collector → /api/routers (Laravel API) → MikroTik RouterOS API
bangucup_collector → Redis Pub/Sub → bangucup_gateway → Browser WebSocket
```

**Server:** `103.164.212.123` (node `laravel` — worker)
**Manager node:** `tameng`
**Domain:** `ucupnet.my.id`

---

## 2. Services Docker Swarm

| Service | Image | Port | Replicas |
|---|---|---|---|
| `bangucup_bangucup_app` | `iswant/bangucup:v1.1.0` | — | 2 |
| `bangucup_bangucup_nginx` | `nginx:1.27-alpine` | 8085→80 | 2 |
| `bangucup_bangucup_queue` | `iswant/bangucup:v1.1.0` | — | 1 |
| `bangucup_bangucup_scheduler` | `iswant/bangucup:v1.1.0` | — | 1 |
| `bangucup_bangucup_collector` | `iswant/bangucup-collector:v1.1.0` | — | 1 |
| `bangucup_bangucup_gateway` | `iswant/bangucup-gateway:v1.1.0` | 8087→8081 | 1 |

---

## 3. Checklist Deploy Baru (dari lokal ke produksi)

### A. Persiapan lokal

1. **Set VITE_WS_URL** di `frontend/admin/.env.production`:
   ```
   VITE_WS_URL=wss://ucupnet.my.id/ws
   ```

2. **Build image:**
   ```bash
   docker build -f docker/php/Dockerfile.prod -t iswant/bangucup:vX.X.X .
   ```

3. **Push ke Docker Hub:**
   ```bash
   docker push iswant/bangucup:vX.X.X
   ```
   Kalau ada perubahan Go services:
   ```bash
   docker build -t iswant/bangucup-collector:vX.X.X ./services/mikrotik-collector
   docker build -t iswant/bangucup-gateway:vX.X.X ./services/realtime-gateway
   docker push iswant/bangucup-collector:vX.X.X
   docker push iswant/bangucup-gateway:vX.X.X
   ```

4. **Update tag** di `docker-compose.swarm.yml`:
   ```yaml
   image: iswant/bangucup:${IMAGE_TAG:-vX.X.X}
   ```

5. **Copy file yang berubah ke server** (docker-compose.swarm.yml, nginx config, dll).

### B. Deploy di server (node tameng — manager)

```bash
cd /opt/docker/bangucup
set -a; source .env; set +a
docker stack deploy -c docker-compose.swarm.yml bangucup
```

### C. Update service spesifik tanpa full redeploy

```bash
docker service update --force --image iswant/bangucup:vX.X.X bangucup_bangucup_app
docker service update --force --image iswant/bangucup:vX.X.X bangucup_bangucup_queue
docker service update --force --image iswant/bangucup:vX.X.X bangucup_bangucup_scheduler
```

### D. Verifikasi semua service running

```bash
docker service ls | grep bangucup
# Semua harus REPLICAS = N/N (tidak ada 0/N)
```

---

## 4. Konfigurasi Penting

### Environment Variables (.env di server)

| Variable | Keterangan |
|---|---|
| `APP_KEY` | Laravel app key — jangan sampai berubah |
| `DB_PASSWORD` | Password PostgreSQL |
| `REDIS_PASSWORD` | Password Redis |
| `COLLECTOR_API_TOKEN` | Token Sanctum untuk collector — **perlu diperbarui jika user di-recreate** |
| `IMAGE_TAG` | Tag image yang digunakan (misal: `v1.1.0`) |
| `GATEWAY_PORT` | Port WebSocket gateway (default: `8087`) |

### Nginx config wajib di default.swarm.conf

```nginx
# index.html HARUS duluan dari index.php agar React SPA yang serve
index index.html index.php;

# API ke PHP
location /api {
    try_files $uri $uri/ /index.php?$query_string;
}

# SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

**⚠️ Kalau `index index.php index.html` (PHP duluan), browser dapat JSON `{"app":"Bangucup"}` bukan React.**

### Nginx Proxy Manager — Custom Location untuk WebSocket

Di proxy host `ucupnet.my.id`, tab **Custom Locations**:
- Location: `/ws`
- Forward: `103.164.212.123:8087`
- Custom config:
```nginx
location /ws {
    proxy_pass http://103.164.212.123:8087;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400;
}
```

---

## 5. Troubleshooting

### Browser tampilkan `{"app":"Bangucup","version":"2.0"}` bukan React

**Penyebab:** Nginx melayani `index.php` duluan sebelum `index.html`.

**Fix:**
```bash
# Di server
sed -i 's/index index\.php index\.html/index index.html index.php/' \
  /opt/docker/bangucup/docker/nginx/default.swarm.conf

docker service update --force bangucup_bangucup_nginx
```

---

### Collector error: `decode routers: invalid character '<'`

**Penyebab:** `COLLECTOR_API_TOKEN` tidak valid atau expired. Laravel return HTML 401 bukan JSON.

**Fix — generate token baru:**
```bash
# Di node laravel
APP_ID=$(docker ps --filter name=bangucup_bangucup_app --format "{{.ID}}" | head -1)
docker exec $APP_ID php artisan tinker --execute="
echo App\Models\User::where('email','admin@bangucup.id')
    ->first()->createToken('collector')->plainTextToken;
"
```

**Update token di server:**
```bash
# Di node tameng — ganti TOKEN dengan hasil di atas
NEW_TOKEN="1|xxxxxxxxxxxx"
sed -i "s/COLLECTOR_API_TOKEN=.*/COLLECTOR_API_TOKEN=$NEW_TOKEN/" \
  /opt/docker/bangucup/.env

docker service update \
  --env-add LARAVEL_API_TOKEN=$NEW_TOKEN \
  bangucup_bangucup_collector
```

---

### WebSocket error: `An insecure WebSocket connection may not be initiated from HTTPS`

**Penyebab:** `VITE_WS_URL=ws://` (tidak secure) diakses dari halaman HTTPS.

**Fix:** Ganti ke `wss://` di `frontend/admin/.env.production`:
```
VITE_WS_URL=wss://ucupnet.my.id/ws
```
Lalu rebuild dan push image, update service di server.

---

### Service app rollback setelah update

**Penyebab paling umum:**
1. `php artisan view:cache` gagal karena direktori `resources/views` tidak ada
2. Token/env tidak valid

**Fix untuk view:cache:**
```bash
# Hapus view:cache dari entrypoint di docker-compose.swarm.yml
sed -i '/php artisan view:cache/d' /opt/docker/bangucup/docker-compose.swarm.yml
docker stack deploy -c docker-compose.swarm.yml bangucup
docker service update --force --image iswant/bangucup:vX.X.X bangucup_bangucup_app
```

---

### Port konflik saat deploy

**Cek port yang terpakai:**
```bash
docker service ls --format "table {{.Name}}\t{{.Ports}}"
ss -tlnp | grep -E "808[0-9]"
```

Port yang sudah terpakai di server ini:
- `80, 81, 443` — Nginx Proxy Manager
- `5432` — PostgreSQL
- `6379` — Redis
- `8080` — lab-management nginx
- `8081` — adminer
- `8085` — bangucup nginx
- `8086` — alumni nginx
- `8087` — bangucup gateway ✅

---

### Container tidak ditemukan di manager node

**Penyebab:** Di Swarm multi-node, container jalan di worker node `laravel`, bukan di manager `tameng`.

**Fix — jalankan perintah dari worker:**
```bash
ssh laravel
docker ps --filter name=bangucup --format "{{.ID}} {{.Names}}"
```

---

## 6. Manajemen User

### Reset user (lupa password / perlu user baru)

```bash
# Di node laravel
APP_ID=$(docker ps --filter name=bangucup_bangucup_app --format "{{.ID}}" | head -1)

docker exec $APP_ID php artisan tinker --execute="
App\Models\User::truncate();
\$user = App\Models\User::create([
    'name'     => 'Administrator',
    'email'    => 'admin@bangucup.id',
    'password' => bcrypt('PasswordBaru123!'),
]);
\$user->assignRole('super_admin');
echo 'Done: ' . \$user->email;
"
```

**⚠️ Setelah truncate user, COLLECTOR_API_TOKEN juga ikut invalid karena token Sanctum dihapus bersama user. Buat token baru (lihat seksi Troubleshooting di atas).**

---

## 7. Monitoring & Logs

```bash
# Status semua service
docker service ls | grep bangucup

# Log app (error PHP)
docker service logs bangucup_bangucup_app --tail 30

# Log collector (polling MikroTik)
docker service logs bangucup_bangucup_collector --tail 20

# Log gateway (WebSocket)
docker service logs bangucup_bangucup_gateway --tail 20

# Log nginx
docker service logs bangucup_bangucup_nginx --tail 20
```

---

## 8. Catatan Penting

- **Jangan hapus user tanpa generate token collector baru terlebih dahulu**
- **Nginx config `index` harus `index.html index.php` (HTML duluan)**
- **VITE_WS_URL harus `wss://` kalau domain pakai HTTPS**
- **docker-compose.swarm.yml di server harus selalu sinkron dengan yang di repo**
- **Collector dan gateway harus di block `services:`, bukan `volumes:`**
- **`php artisan view:cache` tidak boleh ada di entrypoint production**
