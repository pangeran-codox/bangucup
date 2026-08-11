@if (request()->routeIs('filament.admin.auth.login'))
<div class="bangucup-login-bg" aria-hidden="true">
    <div class="bangucup-login-grid"></div>
    <div class="bangucup-login-glow bangucup-login-glow--amber"></div>
    <div class="bangucup-login-glow bangucup-login-glow--signal"></div>

    <div class="bangucup-signal">
        <div class="bangucup-signal-ring bangucup-signal-ring--1"></div>
        <div class="bangucup-signal-ring bangucup-signal-ring--2"></div>
        <div class="bangucup-signal-ring bangucup-signal-ring--3"></div>
        <div class="bangucup-signal-hub"></div>
    </div>
</div>

<style>
    .bangucup-login-bg {
        position: fixed;
        inset: 0;
        z-index: -1;
        overflow: hidden;
        background: #0b0c10;
        pointer-events: none;
    }

    .bangucup-login-grid {
        position: absolute;
        inset: -10%;
        background-image:
            linear-gradient(rgba(242, 240, 234, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(242, 240, 234, 0.06) 1px, transparent 1px);
        background-size: 44px 44px;
        animation: bangucup-grid-pan 30s linear infinite;
    }
    @keyframes bangucup-grid-pan {
        from { background-position: 0 0, 0 0; }
        to { background-position: 44px 44px, 44px 44px; }
    }

    .bangucup-login-glow {
        position: absolute;
        width: 480px;
        height: 480px;
        border-radius: 999px;
        filter: blur(90px);
        opacity: 0.28;
    }
    .bangucup-login-glow--amber { background: #f5a524; left: -120px; bottom: -160px; }
    .bangucup-login-glow--signal { background: #38bfe0; right: -140px; top: -140px; }

    .bangucup-signal {
        position: absolute;
        right: 6%;
        bottom: 8%;
        width: 220px;
        height: 220px;
    }

    .bangucup-signal-hub {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 14px;
        height: 14px;
        margin: -7px 0 0 -7px;
        border-radius: 999px;
        background: #f5a524;
        box-shadow: 0 0 18px 4px rgba(245, 165, 36, 0.5);
        animation: bangucup-hub-breathe 3.6s ease-in-out infinite;
    }
    @keyframes bangucup-hub-breathe {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }

    .bangucup-signal-ring {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 220px;
        height: 220px;
        margin: -110px 0 0 -110px;
        border-radius: 999px;
        border: 1px solid #38bfe0;
        animation: bangucup-ring-pulse 3.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
    }
    .bangucup-signal-ring--2 { animation-delay: 1.2s; }
    .bangucup-signal-ring--3 { animation-delay: 2.4s; }
    @keyframes bangucup-ring-pulse {
        0% { transform: scale(0.1); opacity: 0.5; }
        70% { opacity: 0.12; }
        100% { transform: scale(1); opacity: 0; }
    }

    @media (prefers-reduced-motion: reduce) {
        .bangucup-login-grid { animation: none; }
        .bangucup-signal-hub, .bangucup-signal-ring { animation: none; }
        .bangucup-signal-ring { opacity: 0; }
    }
</style>
@endif