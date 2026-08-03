<?php

return [

    'base_url' => env('GENIEACS_NBI_URL', 'http://genieacs:7557'),

    'timeout' => env('GENIEACS_TIMEOUT', 10),

    'auth' => [
        'username' => env('GENIEACS_USERNAME'),
        'password' => env('GENIEACS_PASSWORD'),
    ],

    // Device dianggap "online" kalau last_inform terjadi dalam N menit terakhir.
    'online_threshold_minutes' => env('GENIEACS_ONLINE_THRESHOLD_MINUTES', 15),

    // Path parameter TR-069. Ini asumsi default untuk ONU Huawei/ZTE (paling umum
    // dipakai RT/RW net Indonesia). SESUAIKAN begitu ada ONU asli yang connect —
    // cek struktur aslinya lewat GenieACS UI (http://localhost:3000) di halaman
    // detail device, tab "Parameters".
    'parameter_paths' => [
        'serial_number' => 'InternetGatewayDevice.DeviceInfo.SerialNumber',
        'brand_model' => 'InternetGatewayDevice.DeviceInfo.ModelName',
        'rx_power' => 'InternetGatewayDevice.WANDevice.1.WANPONInterfaceConfig.RXPower',
        'ssid' => 'InternetGatewayDevice.LANDevice.1.WLANConfiguration.1.SSID',
    ],

];