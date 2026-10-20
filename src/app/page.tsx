'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Gift,
  HandCoins,
  Link2,
  ShieldCheck,
  Smartphone,
  FlaskConical,
  Mail,
  MapPin,
  Send,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import Progress from '@/components/ui/Progress';
import { FOUNDER_EMAIL, SUPPORT_EMAIL, TELEGRAM_BOT_URL } from '@/lib/config';
import RotatingSlogan from '@/components/RotatingSlogan';

function HeroPreview() {
  const { t, locale } = useLanguage();
  const demo = {
    ru: { title: 'Наушники мечты', name: 'Айнура', from: 'Азамат', msg: 'С днём рождения! Пусть музыка всегда будет громкой 🎧' },
    kk: { title: 'Арман құлаққап', name: 'Айнұр', from: 'Азамат', msg: 'Туған күніңмен! Әуенің әрқашан қатты ойнасын 🎧' },
    en: { title: 'Dream headphones', name: 'Aynura', from: 'Azamat', msg: 'Happy birthday! May the music always be loud 🎧' },
  }[locale];

  return (
    <div className="relative mx-auto mb-32 w-full max-w-sm md:mb-16" aria-hidden="true">
      <div className="absolute -inset-y-6 inset-x-0 -z-10 rounded-[2.5rem] sm:-inset-x-6 bg-gradient-to-tr from-brand/15 via-white to-[#14F195]/20 blur-2xl" />
      <div className="card overflow-hidden">
        <img src="/covers/music.jpg" alt="" className="h-36 w-full object-cover" />
        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs font-semibold text-ink-3">{t.wish.forWhom.replace('{name}', demo.name)}</p>
            <p className="text-lg font-bold">{demo.title}</p>
          </div>
          <Progress value={0.68} />
          <div className="flex justify-between text-xs font-semibold text-ink-2">
            <span>{t.wish.raised.replace('{raised}', '3.4 SOL').replace('{goal}', '5 SOL')}</span>
            <span>{t.wish.giftsCount.replace('{count}', '12')}</span>
          </div>
          <div className="btn-primary w-full">{t.wish.send.replace('{amount}', '0.5')}</div>
        </div>
      </div>
      <div className="card absolute -bottom-28 right-2 w-56 rotate-2 p-4 sm:-right-10">
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-mint">
          <BadgeCheck className="h-3.5 w-3.5" /> SPL Memo
        </div>
        <p className="text-sm leading-snug text-ink">“{demo.msg}”</p>
        <p className="mt-2 text-xs font-semibold text-ink-2">— {demo.from} · +0.5 SOL</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useLanguage();
  const h = t.home;

  const steps = [
    { icon: Sparkles, title: h.step1Title, desc: h.step1Desc },
    { icon: Link2, title: h.step2Title, desc: h.step2Desc },
    { icon: Gift, title: h.step3Title, desc: h.step3Desc },
  ];
  const features = [
    { icon: HandCoins, title: h.f1Title, desc: h.f1Desc },
    { icon: ShieldCheck, title: h.f2Title, desc: h.f2Desc },
    { icon: Smartphone, title: h.f3Title, desc: h.f3Desc },
    { icon: Zap, title: h.f4Title, desc: h.f4Desc },
  ];
  const faq = [
    [h.q1, h.a1],
    [h.q2, h.a2],
    [h.q3, h.a3],
    [h.q4, h.a4],
  ];

  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
        <div className="animate-fade-up">
          <h1 className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {/* Для поисковиков и экранных дикторов — неподвижный слоган; визуально первая половина меняется. */}
            <span className="sr-only">{h.titleA} </span>
            <RotatingSlogan key={h.rotating[0]} items={h.rotating} />
            <span className="bg-sol-gradient bg-clip-text text-transparent">{h.titleB}</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-2">{h.subtitle}</p>
          {/* Колонка шириной с ряд кнопок: демо-кнопка растягивается ровно под них. */}
          <div className="mt-8 flex flex-col gap-3 sm:inline-flex">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/create" className="btn-primary px-6 py-3.5 text-base">
                <Gift className="h-5 w-5" />
                {h.ctaWish}
              </Link>
              <Link href="/gift" className="btn-secondary px-6 py-3.5 text-base">
                <Link2 className="h-5 w-5" />
                {h.ctaLink}
              </Link>
            </div>
            <Link
              href="/demo"
              className="group flex items-center gap-3 rounded-2xl border-2 border-brand/30 bg-brand-soft px-5 py-3.5 transition hover:border-brand hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
                <FlaskConical className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-base font-bold text-brand">{t.demo.cta}</span>
                <span className="block text-sm text-ink-2">{t.demo.ctaDesc}</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-brand transition group-hover:translate-x-1" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink-3">{h.note}</p>
        </div>
        <HeroPreview />
      </section>

      {/* Products */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">{h.productsTitle}</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { href: '/create', icon: Gift, title: h.wishTitle, desc: h.wishDesc, cta: h.wishCta, tint: 'bg-brand-soft text-brand' },
            { href: '/gift', icon: Link2, title: h.linkTitle, desc: h.linkDesc, cta: h.linkCta, tint: 'bg-mint-soft text-mint' },
          ].map((p) => (
            <Link key={p.href} href={p.href} className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-pop">
              <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${p.tint}`}>
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-ink-2">{p.desc}</p>
              <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-brand">
                {p.cta}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="mb-10 text-2xl font-extrabold tracking-tight sm:text-3xl">{h.howTitle}</h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {i + 1}
                </div>
                <div>
                  <h3 className="flex items-center gap-2 font-bold">
                    <s.icon className="h-4 w-4 text-brand" />
                    {s.title}
                  </h3>
                  <p className="mt-1.5 leading-relaxed text-ink-2">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mb-8 text-2xl font-extrabold tracking-tight sm:text-3xl">{h.featuresTitle}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="card p-5">
              <f.icon className="mb-4 h-6 w-6 text-brand" />
              <h3 className="font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="mx-auto max-w-6xl px-4 pb-20">
        <div className="rounded-[1.75rem] bg-ink p-6 text-white sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#14F195]">
            <Sparkles className="h-3.5 w-3.5" />
            AI
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">{h.aiTitle}</h2>
          <p className="mt-2 max-w-2xl leading-relaxed text-white/70">{h.aiSubtitle}</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { icon: Sparkles, title: h.ai1Title, desc: h.ai1Desc, soon: false },
              { icon: ShieldCheck, title: h.ai2Title, desc: h.ai2Desc, soon: false },
              { icon: Wand2, title: h.ai3Title, desc: h.ai3Desc, soon: true },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <f.icon className="h-6 w-6 text-[#14F195]" />
                  {f.soon && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/70">{h.aiSoon}</span>
                  )}
                </div>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
          <Link href="/demo" className="btn mt-8 bg-white px-5 py-3 text-ink hover:bg-white/90">
            <FlaskConical className="h-4 w-4" />
            {t.demo.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-20">
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <div className="card p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t.about.title}</h2>
            <p className="mt-4 leading-relaxed text-ink-2">{t.about.p1}</p>
            <p className="mt-3 leading-relaxed text-ink-2">{t.about.p2}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {t.about.facts.map((f, i) => (
                <li key={f} className="chip">
                  {i === 0 && <MapPin className="h-3.5 w-3.5 text-brand" />}
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="card flex flex-col gap-5 p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sol-gradient text-xl font-extrabold text-white">
                {t.about.founderName.slice(0, 1)}
              </div>
              <div>
                <p className="text-lg font-bold">{t.about.founderName}</p>
                <p className="text-sm text-ink-3">{t.about.founderRole} · SolWish</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-ink-3">{t.about.partners}</p>
                <a href={`mailto:${FOUNDER_EMAIL}`} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-strong">
                  <Mail className="h-4 w-4" />
                  {FOUNDER_EMAIL}
                </a>
              </div>
              <div>
                <p className="text-ink-3">{t.about.support}</p>
                <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-brand-strong">
                  <Mail className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>
              </div>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-ink-2 hover:text-ink"
              >
                <Send className="h-4 w-4" />
                {h.telegram}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">{h.faqTitle}</h2>
        <div className="card divide-y divide-line">
          {faq.map(([q, a]) => (
            <details key={q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                {q}
                <span className="text-xl leading-none text-ink-3 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 leading-relaxed text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex flex-col items-center rounded-[1.75rem] bg-ink px-6 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight">{h.readyTitle}</h2>
          <p className="mt-2 text-white/70">{h.readySubtitle}</p>
          <Link href="/create" className="btn mt-7 bg-white px-6 py-3.5 text-base text-ink hover:bg-white/90">
            {h.ctaWish}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
