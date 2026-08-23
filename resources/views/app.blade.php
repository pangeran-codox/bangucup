<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bangucup — Internet Fiber Warga Jember</title>

    {{--
        Font loading strategy:
        1. preconnect ke fonts.gstatic.com (tempat file font beneran) agar TLS
           handshake sudah selesai sebelum browser request font.
        2. <link rel="preload"> untuk font paling penting (Inter 400 & 500) agar
           browser fetch font bersamaan dengan CSS, bukan setelah parse CSS.
        3. Stylesheet Google Fonts dimuat dengan media="print" trick — tidak
           render-blocking. Browser tetap download CSS-nya di background, lalu
           media di-swap ke "all" setelah load. Fallback <noscript> untuk JS-off.
    --}}
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    {{-- Non-blocking font stylesheet --}}
    <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap"
        media="print"
        onload="this.media='all'"
    >
    <noscript>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap">
    </noscript>

    {{-- Vite bundles (JS + CSS) --}}
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body>
    @inertia
</body>
</html>
