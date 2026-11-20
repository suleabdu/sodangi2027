import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Mail, Play, Video, X } from 'lucide-react';
import type { Entry, SiteData } from './types';
import { type Lang, tr } from './i18n';

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogFocus(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => {
      const initial = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-initial]');
      (initial ?? dialogRef.current)?.focus();
    }, 0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      previous?.focus();
    };
  }, [open]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => !element.hasAttribute('disabled'));
    if (!focusables.length) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return { dialogRef, onKeyDown };
}

function socialEmbed(url: string, mediaType: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (['www.tiktok.com', 'tiktok.com', 'm.tiktok.com'].includes(host)) {
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      return match ? `https://www.tiktok.com/player/v1/${match[1]}` : null;
    }
    if (['www.instagram.com', 'instagram.com'].includes(host)) {
      const match = parsed.pathname.match(/^\/(reel|p|tv)\/([\w-]+)/);
      return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed/` : null;
    }
    if (['www.facebook.com', 'facebook.com', 'm.facebook.com', 'fb.watch'].includes(host)) {
      const plugin = ['video', 'reel'].includes(mediaType) ? 'video' : 'post';
      return `https://www.facebook.com/plugins/${plugin}.php?href=${encodeURIComponent(url)}&show_text=true&width=480`;
    }
  } catch {
    return null;
  }
  return null;
}

function dateLabel(value: string, lang: Lang) {
  try {
    return new Intl.DateTimeFormat(lang === 'ha' ? 'ha-NG' : 'en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function SkipLink() {
  return <a className="skip-link" href="#main-content">Skip to main content</a>;
}

export function RouteFocus({ path }: { path: string }) {
  const hasRendered = useRef(false);
  useEffect(() => {
    if (!hasRendered.current) {
      hasRendered.current = true;
      return;
    }
    window.requestAnimationFrame(() => document.getElementById('main-content')?.focus({ preventScroll: true }));
  }, [path]);
  return null;
}

export function AccessibleNewsletter({ site, onClose, lang }: { site: SiteData; onClose: () => void; lang: Lang }) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const { dialogRef, onKeyDown } = useDialogFocus(true, onClose);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const response = await fetch('/api/newsletter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, consent, website: '' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || tr(lang, 'tryAgain'));
      setMessage(tr(lang, 'newsletterCheckEmail'));
      setEmail('');
      setConsent(false);
    } catch (reason) {
      setError(true);
      setMessage(lang === 'ha' ? tr(lang, 'tryAgain') : reason instanceof Error ? reason.message : tr(lang, 'tryAgain'));
    } finally {
      setBusy(false);
    }
  };

  return <div className="modal-layer" role="presentation"><div className="modal-backdrop" onClick={onClose} /><div ref={dialogRef} className="newsletter-modal" role="dialog" aria-modal="true" aria-labelledby="newsletter-title" onKeyDown={onKeyDown} tabIndex={-1}><button type="button" data-dialog-initial className="modal-x" onClick={onClose} aria-label={tr(lang, 'closeNewsletter')}><X /></button><div className="newsletter-emblem"><Mail size={30} /></div><div className="eyebrow">{tr(lang, 'stayConnected')}</div><h2 id="newsletter-title">{site.newsletter.popupTitle}</h2><p>{site.newsletter.popupBody}</p><form onSubmit={submit}><label htmlFor="subscriber-email">{tr(lang, 'emailAddress')}</label><input id="subscriber-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><label className="check-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} required /><span>{tr(lang, 'consent')}</span></label><button className="btn navy full" type="submit" disabled={busy}>{busy ? tr(lang, 'submitting') : tr(lang, 'confirmSubscribe')} <Play size={15} /></button>{message && <div role="status" className={`form-feedback ${error ? 'error' : 'success'}`}>{message}</div>}</form></div></div>;
}

function MediaTile({ entry, lang, onOpen }: { entry: Entry; lang: Lang; onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  return <button type="button" className="social-tile" onClick={onOpen}><div className="social-tile-visual">{entry.image ? <img src={entry.image} loading="lazy" alt="" /> : <div className="social-placeholder"><Video size={36} /></div>}{['video', 'reel'].includes(entry.media_type) && <span className="social-play"><Play fill="currentColor" size={20} /></span>}<span className="social-platform">{entry.platform || tr(lang, 'socialUpdate')}</span></div><h3>{entry.title}</h3><span>{dateLabel(entry.published_at, lang)}</span></button>;
}

export function AccessibleMediaHub({ entries, site, lang }: { entries: Entry[]; site: SiteData; lang: Lang }) {
  const items = entries.filter((entry) => entry.kind === 'social');
  const [tab, setTab] = useState('All');
  const [active, setActive] = useState<number | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const types = ['All', 'Videos', 'Photos', 'Posts'];
  const shown = items.filter((entry) => tab === 'All' || (tab === 'Videos' ? ['reel', 'video'].includes(entry.media_type) : tab === 'Photos' ? entry.media_type === 'photo' : !['reel', 'video', 'photo'].includes(entry.media_type)));
  const close = useCallback(() => setActive(null), []);
  const { dialogRef, onKeyDown } = useDialogFocus(active !== null, close);
  const current = active === null ? null : shown[active];

  useEffect(() => {
    if (active !== null) window.dispatchEvent(new CustomEvent('sodangi-media-open'));
  }, [active]);

  const onDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setActive((value) => value === null ? value : Math.min(value + 1, shown.length - 1));
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive((value) => value === null ? value : Math.max(value - 1, 0));
      return;
    }
    onKeyDown(event);
  };

  const tabs: Record<string, string> = { All: 'all', Videos: 'videos', Photos: 'photos', Posts: 'posts' };
  return <><div className="page-hero"><div className="container"><div className="eyebrow light">{tr(lang, 'mediaTag')}</div><h1>{tr(lang, 'storiesMotion')}</h1><p>{tr(lang, 'mediaIntro')}</p></div></div><section className="section"><div className="container"><div className="tabbar" role="tablist" aria-label="Media categories">{types.map((type) => <button type="button" role="tab" aria-selected={tab === type} key={type} className={tab === type ? 'selected' : ''} onClick={() => { setTab(type); setActive(null); }}>{tr(lang, tabs[type])}</button>)}</div>{shown.length ? <div className="media-grid">{shown.map((entry, index) => <MediaTile key={entry.id} entry={entry} lang={lang} onOpen={(event) => { triggerRef.current = event.currentTarget; setActive(index); }} />)}</div> : <div className="no-posts"><Play size={36} /><h3>{tr(lang, 'noMedia')}</h3><p>{tr(lang, 'mediaPending')}</p></div>}{[site.contact.facebook, site.contact.instagram, site.contact.tiktok].some(Boolean) && <div className="social-links-large">{(['facebook', 'instagram', 'tiktok'] as const).map((network) => site.contact[network] && <a href={site.contact[network]} target="_blank" rel="noopener noreferrer" key={network}>{tr(lang, 'visit')} {network} <ExternalLink size={15} /></a>)}</div>}</div></section>{current && <div className="reel-overlay" role="presentation"><div className="reel-backdrop" onClick={close} /><div ref={dialogRef} className="reel-viewer" role="dialog" aria-modal="true" aria-label={tr(lang, 'mediaViewer')} tabIndex={-1} onKeyDown={onDialogKeyDown} onTouchStart={(event) => setTouchStart(event.touches[0]?.clientY ?? null)} onTouchEnd={(event) => { if (touchStart === null) return; const delta = (event.changedTouches[0]?.clientY ?? touchStart) - touchStart; if (Math.abs(delta) > 55) setActive((value) => value === null ? value : Math.max(0, Math.min(shown.length - 1, value + (delta < 0 ? 1 : -1)))); setTouchStart(null); }}><button type="button" data-dialog-initial className="reel-close" aria-label={tr(lang, 'closeMedia')} onClick={close}><X /></button><div className="reel-media">{socialEmbed(current.url, current.media_type) ? <iframe key={current.id} src={socialEmbed(current.url, current.media_type) ?? ''} title={current.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> : current.image ? <img src={current.image} alt={tr(lang, 'selectedMedia')} /> : <Video size={64} />}</div><div className="reel-info"><strong>{current.title}</strong><p>{current.excerpt}</p>{current.url && <a href={current.url} target="_blank" rel="noopener noreferrer">{tr(lang, 'viewOriginal')} <ExternalLink size={14} /></a>}<div className="reel-navigation"><button type="button" disabled={active === 0} onClick={() => setActive((value) => value === null ? value : value - 1)}><ArrowUp size={18} />{tr(lang, 'previous')}</button><button type="button" disabled={active === shown.length - 1} onClick={() => setActive((value) => value === null ? value : value + 1)}>{tr(lang, 'next')}<ArrowDown size={18} /></button></div></div></div></div>}</>;
}
