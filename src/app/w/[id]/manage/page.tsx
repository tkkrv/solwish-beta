'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ArrowLeft, Lock, LockOpen, Save, Trash2, Wallet } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { LIMITS } from '@/lib/config';
import { COVER_PRESETS } from '@/lib/covers';
import { fetchJson, humanizeError } from '@/lib/client/errors';
import { signWalletAuth } from '@/lib/client/wallet-auth';
import { useToast } from '@/components/Toast';
import Spinner from '@/components/ui/Spinner';
import NotFoundCard from '@/components/NotFoundCard';
import type { UpdateWishInput } from '@/lib/validation';
import type { Wish } from '@/lib/types';

export default function ManageWishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useLanguage();
  const mg = t.manage;
  const toast = useToast();
  const router = useRouter();
  const { publicKey, signMessage } = useWallet();
  const { setVisible } = useWalletModal();

  const [wish, setWish] = useState<Wish | null | undefined>(undefined);
  const [form, setForm] = useState({ title: '', description: '', creatorName: '', eventDate: '', iconUrl: '' });
  const [busy, setBusy] = useState<null | 'save' | 'close' | 'delete'>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/wishes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const w: Wish | null = d?.wish ?? null;
        setWish(w);
        if (w) {
          setForm({
            title: w.title,
            description: w.description,
            creatorName: w.creatorName,
            eventDate: w.eventDate ?? '',
            iconUrl: w.iconUrl,
          });
        }
      })
      .catch(() => alive && setWish(null));
    return () => {
      alive = false;
    };
  }, [id]);

  if (wish === undefined) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-ink-3">
        <Spinner /> {t.common.loading}
      </div>
    );
  }
  if (wish === null) return <NotFoundCard kind="wish" />;

  const me = publicKey?.toBase58();
  const allowed = !!me && (me === wish.recipientWallet || me === wish.creatorWallet);

  const call = async (kind: 'save' | 'close' | 'delete', patch?: UpdateWishInput) => {
    if (!publicKey || !signMessage) return;
    setBusy(kind);
    try {
      const auth = await signWalletAuth({ action: 'manage-wish', target: wish.id, publicKey, signMessage });
      if (kind === 'delete') {
        await fetchJson(`/api/wishes/${wish.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auth }),
        });
        toast(mg.deleted, 'success');
        router.push('/my');
        return;
      }
      const { wish: updated } = await fetchJson<{ wish: Wish }>(`/api/wishes/${wish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth, patch }),
      });
      setWish(updated);
      toast(mg.saved, 'success');
    } catch (err) {
      const msg = (err as Error)?.message || '';
      toast(/forbidden/.test(msg) ? t.errors.forbidden : humanizeError(err, t));
    } finally {
      setBusy(null);
    }
  };

  const save = () =>
    call('save', {
      title: form.title.trim(),
      description: form.description.trim(),
      creatorName: form.creatorName.trim(),
      eventDate: form.eventDate || null,
      iconUrl: form.iconUrl,
    });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`/w/${wish.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        {mg.back}
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{mg.title}</h1>
      <p className="mt-1 text-ink-2">{wish.title}</p>

      {!me ? (
        <div className="card mt-8 p-6 text-center">
          <p className="text-ink-2">{mg.connectPrompt}</p>
          <button type="button" onClick={() => setVisible(true)} className="btn-primary mt-4">
            <Wallet className="h-4 w-4" />
            {t.wish.connect}
          </button>
        </div>
      ) : !allowed ? (
        <div className="card mt-8 p-6 text-center text-ink-2">{mg.notOwner}</div>
      ) : (
        <>
          <div className="card mt-8 space-y-5 p-5 sm:p-7">
            <div>
              <label htmlFor="m-title" className="field-label">
                {t.create.fTitle}
              </label>
              <input
                id="m-title"
                className="input"
                maxLength={LIMITS.titleMax}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="m-for" className="field-label">
                  {t.create.fFor}
                </label>
                <input
                  id="m-for"
                  className="input"
                  maxLength={LIMITS.nameMax}
                  value={form.creatorName}
                  onChange={(e) => setForm((f) => ({ ...f, creatorName: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="m-date" className="field-label">
                  {t.create.fEventDate}
                </label>
                <input
                  id="m-date"
                  type="date"
                  className="input"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label htmlFor="m-story" className="field-label">
                {t.create.fStory}
              </label>
              <textarea
                id="m-story"
                rows={3}
                className="input resize-none"
                maxLength={LIMITS.descriptionMax}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <fieldset>
              <legend className="field-label">{t.create.fCover}</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {COVER_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    aria-label={p.key}
                    aria-pressed={form.iconUrl.endsWith(p.path)}
                    onClick={() => setForm((f) => ({ ...f, iconUrl: p.path }))}
                    className={`overflow-hidden rounded-xl border-2 transition ${
                      form.iconUrl.endsWith(p.path) ? 'border-brand ring-4 ring-brand-soft' : 'border-transparent'
                    }`}
                  >
                    <img src={p.path} alt="" className="aspect-square w-full object-cover" />
                  </button>
                ))}
              </div>
            </fieldset>
            <button type="button" disabled={!!busy || form.title.trim().length < 2} onClick={save} className="btn-primary w-full">
              {busy === 'save' ? <Spinner /> : <Save className="h-4 w-4" />}
              {mg.save}
            </button>
            <p className="text-center text-xs text-ink-3">{mg.signHint}</p>
          </div>

          <div className="card mt-6 divide-y divide-line">
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">{mg.closeHint}</p>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => call('close', { closed: !wish.closed })}
                className="btn-secondary shrink-0"
              >
                {busy === 'close' ? <Spinner /> : wish.closed ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {wish.closed ? mg.reopen : mg.close}
              </button>
            </div>
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-2">{mg.deleteConfirm}</p>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => window.confirm(mg.deleteConfirm) && call('delete')}
                className="btn shrink-0 border border-danger/30 bg-danger-soft text-danger hover:bg-danger/10"
              >
                {busy === 'delete' ? <Spinner /> : <Trash2 className="h-4 w-4" />}
                {mg.delete}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
