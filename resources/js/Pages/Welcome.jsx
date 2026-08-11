import { Head } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

// TODO: ganti dengan nomor WhatsApp bisnis asli (format: kode negara tanpa "+", tanpa spasi)
const WHATSAPP_NUMBER = '6281234567890';

const waLink = (message) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const formatRupiah = (amount) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

const FIBER_PATH = 'M0,90 C140,20 260,160 420,70 C520,15 560,80 600,60';

const VALUE_PROPS = [
    {
        title: 'Dipasang Warga Sendiri',
        body: 'Teknisi tinggal di sekitar kamu juga. Kalau internet mendadak lemot, yang datang orang yang kamu kenal — bukan robot call center.',
    },
    {
        title: 'Harga Jujur, Gak Ada Nyempil',
        body: 'Sekali bayar sesuai paket yang kamu pilih. Gak ada biaya tambahan siluman di tagihan bulan depan.',
    },
    {
        title: 'Kabel Dijaga, Bukan Dibiarin',
        body: 'Jaringan dipantau tiap hari. Titik rawan ketauan dan diperbaiki sebelum jadi masalah besar buat kamu.',
    },
];

// ---- hooks kecil buat animasi ----

function useInView(threshold = 0.2) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setInView(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, inView];
}

function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
    const [ref, inView] = useInView(0.15);
    return (
        <Tag
            ref={ref}
            className={`reveal ${inView ? 'reveal-visible' : ''} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </Tag>
    );
}

function useCountUp(target, active, duration = 1100) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) return;

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setValue(target);
            return;
        }

        let raf;
        let start = null;
        const step = (ts) => {
            if (start === null) start = ts;
            const progress = Math.min((ts - start) / duration, 1);
            setValue(Math.floor(progress * target));
            if (progress < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [active, target, duration]);

    return value;
}

// ---- halaman ----

export default function Welcome({ packages = [] }) {
    return (
        <>
            <Head title="Bangucup — Internet Fiber Warga Jember" />

            <div className="bg-page">
                <Header />
                <Hero />
                <ValueProps />
                <Packages packages={packages} />
                <ServiceArea />
                <FooterCta />

                <style>{`
                    :root {
                        --bg: #0b0c10;
                        --panel: #15171c;
                        --panel-line: #262931;
                        --amber: #f5a524;
                        --signal: #38bfe0;
                        --text: #f2f0ea;
                        --muted: #8b93a3;
                    }

                    .bg-page {
                        background: var(--bg);
                        color: var(--text);
                        font-family: 'Inter', system-ui, sans-serif;
                        min-height: 100vh;
                        overflow-x: hidden;
                    }

                    .font-display { font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif; }
                    .font-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

                    /* reveal on scroll — blur ke fokus, beda dari slide-up sebelumnya */
                    .reveal {
                        opacity: 0;
                        filter: blur(8px);
                        transform: scale(0.97);
                        transition: opacity 0.8s ease, filter 0.8s ease, transform 0.8s ease;
                    }
                    .reveal-visible { opacity: 1; filter: blur(0); transform: scale(1); }

                    /* hero grid background */
                    .hero-grid {
                        position: absolute;
                        inset: -10% -10%;
                        background-image:
                            linear-gradient(var(--panel-line) 1px, transparent 1px),
                            linear-gradient(90deg, var(--panel-line) 1px, transparent 1px);
                        background-size: 44px 44px;
                        opacity: 0.35;
                        animation: grid-pan 30s linear infinite;
                        -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 85%);
                        mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 40%, transparent 85%);
                    }
                    @keyframes grid-pan {
                        from { background-position: 0 0, 0 0; }
                        to { background-position: 44px 44px, 44px 44px; }
                    }

                    /* headline word reveal on load */
                    .hero-line {
                        display: block;
                        opacity: 0;
                        transform: translateY(18px);
                        animation: line-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    }
                    .hero-line:nth-child(1) { animation-delay: 0.05s; }
                    .hero-line:nth-child(2) { animation-delay: 0.2s; }
                    @keyframes line-in {
                        to { opacity: 1; transform: translateY(0); }
                    }

                    /* sinyal radar: riak melingkar dari hub + node "rumah" nyala berurutan */
                    .signal-hub {
                        animation: hub-breathe 3.6s ease-in-out infinite;
                    }
                    @keyframes hub-breathe {
                        0%, 100% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.12); }
                    }

                    .signal-ring {
                        animation: ring-pulse 3.6s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
                    }
                    .signal-ring--2 { animation-delay: 1.2s; }
                    .signal-ring--3 { animation-delay: 2.4s; }
                    @keyframes ring-pulse {
                        0% { transform: translate(-50%, -50%) scale(0.12); opacity: 0.55; }
                        70% { opacity: 0.12; }
                        100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                    }

                    .signal-node {
                        animation: node-flash 3.6s ease-in-out infinite;
                    }
                    @keyframes node-flash {
                        0%, 100% { opacity: 0.35; box-shadow: 0 0 0 rgba(245, 165, 36, 0); }
                        8% { opacity: 1; box-shadow: 0 0 14px 3px rgba(245, 165, 36, 0.55); }
                        22% { opacity: 0.35; box-shadow: 0 0 0 rgba(245, 165, 36, 0); }
                    }

                    /* nav underline */
                    .nav-link { position: relative; }
                    .nav-link::after {
                        content: '';
                        position: absolute;
                        left: 0; bottom: -4px;
                        width: 0; height: 1px;
                        background: var(--amber);
                        transition: width 0.25s ease;
                    }
                    .nav-link:hover::after { width: 100%; }

                    /* card hover glow */
                    .pkg-card {
                        transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.35s ease, box-shadow 0.35s ease;
                    }
                    .pkg-card:hover {
                        transform: translateY(-6px);
                        border-color: rgba(245, 165, 36, 0.5);
                        box-shadow: 0 20px 40px -20px rgba(245, 165, 36, 0.25);
                    }

                    .btn-glow { transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease; }
                    .btn-glow:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(245, 165, 36, 0.45); filter: brightness(1.08); }

                    @media (prefers-reduced-motion: reduce) {
                        .reveal { opacity: 1; filter: none; transform: none; transition: none; }
                        .hero-grid { animation: none; }
                        .hero-line { animation: none; opacity: 1; transform: none; }
                        .signal-hub, .signal-ring, .signal-node { animation: none; }
                        .signal-ring { opacity: 0; }
                        .signal-node { opacity: 1; box-shadow: 0 0 10px 2px rgba(245, 165, 36, 0.4); }
                    }
                `}</style>
            </div>
        </>
    );
}

function Header() {
    return (
        <header className="sticky top-0 z-20 border-b border-[var(--panel-line)] bg-[var(--bg)]/85 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <span className="font-display text-lg font-semibold tracking-tight">
                    Bang<span className="text-[var(--amber)]">ucup</span>
                </span>
                <nav className="hidden items-center gap-8 text-sm text-[var(--muted)] sm:flex">
                    <a href="#paket" className="nav-link transition hover:text-[var(--text)]">Paket</a>
                    <a href="#area" className="nav-link transition hover:text-[var(--text)]">Area Layanan</a>
                    <a href="/admin" className="nav-link transition hover:text-[var(--text)]">Login</a>
                </nav>
                <a
                    href={waLink('Halo Bangucup, saya mau tanya soal pasang internet.')}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-glow rounded-full bg-[var(--amber)] px-4 py-2 text-sm font-medium text-[#1c1408]"
                >
                    Hubungi via WA
                </a>
            </div>
        </header>
    );
}

function Hero() {
    return (
        <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
            <div className="hero-grid" aria-hidden="true" />

            <div className="relative mx-auto max-w-6xl">
                <div className="grid items-center gap-12 lg:grid-cols-2">
                    <div>
                        <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--signal)]">
                            ISP Lokal &middot; Jember
                        </span>
                        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.1] sm:text-5xl">
                            <span className="hero-line">Internet kenceng,</span>
                            <span className="hero-line">
                                yang masang <span className="text-[var(--amber)]">tetangga sendiri.</span>
                            </span>
                        </h1>
                        <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--muted)]">
                            Bangucup masang fiber langsung ke rumah warga sekitar Jember.
                            Dari pendaftaran sampai gangguan teknis, yang nanganin orang
                            yang tinggal satu wilayah sama kamu.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <a
                                href={waLink('Halo Bangucup, saya mau daftar internet rumahan.')}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-glow rounded-full bg-[var(--amber)] px-6 py-3 text-sm font-semibold text-[#1c1408]"
                            >
                                Daftar Sekarang
                            </a>
                            <a
                                href="#paket"
                                className="btn-glow rounded-full border border-[var(--panel-line)] px-6 py-3 text-sm font-medium text-[var(--text)] hover:border-[var(--muted)]"
                            >
                                Lihat Paket
                            </a>
                        </div>
                    </div>

                    <HeroSignal />
                </div>
            </div>
        </section>
    );
}

// Node "rumah tetangga" tersebar di sekeliling hub, tiap node nyala
// bergiliran seolah sinyal barusan sampai ke situ.
const SIGNAL_NODES = [
    { angle: 15, radius: 40, delay: 0.15 },
    { angle: 65, radius: 30, delay: 0.55 },
    { angle: 115, radius: 42, delay: 0.35 },
    { angle: 160, radius: 33, delay: 0.75 },
    { angle: -25, radius: 36, delay: 0.45 },
    { angle: -75, radius: 28, delay: 0.9 },
    { angle: -135, radius: 40, delay: 0.1 },
    { angle: -170, radius: 25, delay: 0.65 },
];

function HeroSignal() {
    return (
        <div className="relative mx-auto aspect-square w-full max-w-sm sm:max-w-md">
            {/* riak melingkar dari hub */}
            <div className="signal-ring signal-ring--1 absolute left-1/2 top-1/2 h-80 w-80 rounded-full border border-[var(--signal)]" />
            <div className="signal-ring signal-ring--2 absolute left-1/2 top-1/2 h-80 w-80 rounded-full border border-[var(--signal)]" />
            <div className="signal-ring signal-ring--3 absolute left-1/2 top-1/2 h-80 w-80 rounded-full border border-[var(--signal)]" />

            {/* hub di tengah (Bangucup) */}
            <div
                className="signal-hub absolute left-1/2 top-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--amber)]"
                style={{ boxShadow: '0 0 20px 4px rgba(245, 165, 36, 0.45)' }}
            >
                <span className="font-mono text-[10px] font-semibold text-[#1c1408]">HUB</span>
            </div>

            {/* node rumah-rumah tetangga */}
            {SIGNAL_NODES.map((node, i) => {
                const rad = (node.angle * Math.PI) / 180;
                const x = 50 + node.radius * Math.cos(rad);
                const y = 50 + node.radius * Math.sin(rad);
                return (
                    <div
                        key={i}
                        className="signal-node absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--amber)]"
                        style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${node.delay}s` }}
                    />
                );
            })}

            <span className="font-mono absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-[var(--muted)]">
                sinyal menjangkau tetangga
            </span>
        </div>
    );
}

function ValueProps() {
    return (
        <section className="border-y border-[var(--panel-line)] bg-[var(--panel)]/40 px-6 py-16">
            <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-3">
                {VALUE_PROPS.map((item, i) => (
                    <Reveal key={item.title} delay={i * 120}>
                        <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
                    </Reveal>
                ))}
            </div>
        </section>
    );
}

function PackageCard({ pkg, delay }) {
    const [ref, inView] = useInView(0.3);
    const speed = useCountUp(pkg.speed_mbps, inView);
    const price = useCountUp(pkg.price, inView, 1400);

    return (
        <div
            ref={ref}
            className={`pkg-card reveal ${inView ? 'reveal-visible' : ''} rounded-2xl border border-[var(--panel-line)] bg-[var(--panel)] p-6`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            <p className="font-display text-base font-semibold">{pkg.name}</p>
            <p className="font-mono mt-3 text-3xl font-semibold text-[var(--signal)]">
                {speed}
                <span className="ml-1 text-sm text-[var(--muted)]">Mbps</span>
            </p>
            <p className="mt-4 text-2xl font-semibold">
                {formatRupiah(price)}
                <span className="text-sm font-normal text-[var(--muted)]">/bulan</span>
            </p>
            <a
                href={waLink(`Halo Bangucup, saya mau daftar paket ${pkg.name}.`)}
                target="_blank"
                rel="noreferrer"
                className="btn-glow mt-6 block rounded-full border border-[var(--panel-line)] py-2.5 text-center text-sm font-medium hover:border-[var(--amber)] hover:text-[var(--amber)]"
            >
                Pilih Paket
            </a>
        </div>
    );
}

function Packages({ packages }) {
    return (
        <section id="paket" className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <Reveal className="max-w-lg">
                    <h2 className="font-display text-3xl font-semibold">Pilih paket sesuai kebutuhan</h2>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                        Semua paket pakai fiber optik sampai ke rumah, tanpa kuota harian.
                    </p>
                </Reveal>

                {packages.length === 0 ? (
                    <p className="mt-10 text-sm text-[var(--muted)]">
                        Paket belum tersedia saat ini — hubungi kami via WhatsApp buat info terbaru.
                    </p>
                ) : (
                    <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {packages.map((pkg, i) => (
                            <PackageCard key={pkg.id} pkg={pkg} delay={i * 90} />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

function ServiceArea() {
    return (
        <section id="area" className="border-t border-[var(--panel-line)] bg-[var(--panel)]/40 px-6 py-16">
            <Reveal className="mx-auto max-w-6xl">
                <h2 className="font-display text-2xl font-semibold">Area layanan</h2>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                    Saat ini Bangucup melayani wilayah sekitar Jember dan terus meluas
                    ke RT/RW berikutnya. Belum yakin rumah kamu kejangkau atau enggak?
                    Kirim lokasi kamu lewat WhatsApp, kami cek titik ODP terdekat.
                </p>
                <a
                    href={waLink('Halo Bangucup, saya mau cek apakah lokasi saya sudah kejangkau jaringan.')}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-6 inline-block text-sm font-medium text-[var(--amber)] underline underline-offset-4"
                >
                    Cek jangkauan lokasi saya &rarr;
                </a>
            </Reveal>
        </section>
    );
}

function FooterCta() {
    return (
        <footer className="px-6 py-16">
            <Reveal className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 border-t border-[var(--panel-line)] pt-12 sm:flex-row sm:items-end" as="div">
                <div>
                    <p className="font-display text-2xl font-semibold">Mau pasang di rumah kamu?</p>
                    <p className="mt-2 text-sm text-[var(--muted)]">Chat langsung, biasanya dibalas dalam hitungan menit.</p>
                </div>
                <a
                    href={waLink('Halo Bangucup, saya mau daftar internet rumahan.')}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-glow rounded-full bg-[var(--amber)] px-6 py-3 text-sm font-semibold text-[#1c1408]"
                >
                    Hubungi via WhatsApp
                </a>
            </Reveal>
            <p className="font-mono mx-auto mt-10 max-w-6xl text-xs text-[var(--muted)]">
                &copy; {new Date().getFullYear()} Bangucup. Internet warga, punya warga.
            </p>
        </footer>
    );
}