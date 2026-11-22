import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Edit3,
  Eye,
  Facebook,
  FileText,
  Globe2,
  Image as ImageIcon,
  Languages,
  LayoutDashboard,
  Layers,
  LockKeyhole,
  LogOut,
  Mail,
  Newspaper,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { Entry, SiteData } from './types';
import { ensureTranslations, type Lang } from './i18n';

type Notice = { tone: 'success' | 'error'; text: string } | null;
type Tab = 'overview' | 'site' | 'entries' | 'integrations' | 'operations';
type Path = Array<string | number>;
type AdminAuthMode = 'access' | 'password';
type AdminAuthConfig = { mode: AdminAuthMode; passwordConfigured: boolean };

type FacebookConfig = {
  enabled: boolean;
  pageId: string;
  pageUrl: string;
  autoPublish: boolean;
  syncIntervalMinutes: number;
};

type FacebookState = {
  lastSyncedAt?: string | null;
  lastStatus?: string;
  lastError?: string | null;
  synced?: number;
};

type FacebookPayload = {
  facebook?: Partial<FacebookConfig & FacebookState & { tokenConfigured: boolean }>;
  imported?: number;
};

const defaultFacebook: FacebookConfig = {
  enabled: false,
  pageId: '',
  pageUrl: '',
  autoPublish: false,
  syncIntervalMinutes: 15,
};

const blankEntry = (): Entry => ({
  id: '',
  kind: 'news',
  title: '',
  excerpt: '',
  body: '',
  title_ha: '',
  excerpt_ha: '',
  body_ha: '',
  image: '',
  url: '',
  platform: '',
  media_type: 'post',
  status: 'draft',
  published_at: new Date().toISOString(),
});

const dateLabel = (value?: string | null) => {
  if (!value) return 'Not yet';
  try {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const titleCase = (value: string) =>
  value.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (letter) => letter.toUpperCase());

const emptyLike = (value: unknown): unknown => {
  if (Array.isArray(value)) return [];
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, emptyLike(child)]));
  }
  if (typeof value === 'boolean') return false;
  if (typeof value === 'number') return 0;
  return '';
};

const setAtPath = (source: any, path: Path, nextValue: unknown): any => {
  if (!path.length) return nextValue;
  const [head, ...tail] = path;
  const base = Array.isArray(source) ? source : source && typeof source === 'object' ? source : typeof head === 'number' ? [] : {};
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[head] = setAtPath(base[head], tail, nextValue);
  return copy;
};

type FileUploaderProps = {
  label: string;
  image?: boolean;
  onUpload: (file: File) => Promise<string | null>;
  onComplete: (url: string) => void;
};

function FileUploader({ label, image = true, onUpload, onComplete }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await onUpload(file);
      if (url) onComplete(url);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <label className="studio-upload">
      <Upload size={15} />
      {uploading ? 'Uploading…' : label}
      <input
        type="file"
        accept={image ? 'image/png,image/jpeg,image/webp,image/avif' : 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/ogg,audio/wav,audio/x-wav,.mp3,.m4a,.ogg,.wav'}
        onChange={handleChange}
        disabled={uploading}
      />
    </label>
  );
}

type FieldEditorProps = {
  label: string;
  value: any;
  path: Path;
  onChange: (value: unknown) => void;
  upload: (file: File) => Promise<string | null>;
};

function FieldEditor({ label, value, path, onChange, upload }: FieldEditorProps) {
  const inputId = `setting-${path.join('-').replace(/[^a-zA-Z0-9-]/g, '')}`;
  const isImage = /(?:image|portrait|logo|photo|banner)/i.test(label);
  const isAudio = /audio|music/i.test(label) && /url/i.test(label);

  if (Array.isArray(value)) {
    const addItem = () => onChange([...value, emptyLike(value[0] ?? '')]);
    return (
      <fieldset className="studio-field studio-array">
        <legend>{titleCase(label)}</legend>
        {value.map((item, index) => (
          <div className="studio-array-item" key={`${label}-${index}`}>
            <div className="studio-array-toolbar">
              <strong>{titleCase(label)} {index + 1}</strong>
              <div>
                <button type="button" onClick={() => { if (index === 0) return; const next = [...value]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }} disabled={index === 0} aria-label={`Move ${label} ${index + 1} up`}>↑</button>
                <button type="button" onClick={() => { if (index === value.length - 1) return; const next = [...value]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; onChange(next); }} disabled={index === value.length - 1} aria-label={`Move ${label} ${index + 1} down`}>↓</button>
                <button type="button" onClick={() => onChange(value.filter((_: unknown, itemIndex: number) => itemIndex !== index))} aria-label={`Remove ${label} ${index + 1}`}><Trash2 size={14} /></button>
              </div>
            </div>
            <FieldEditor label={`${label} ${index + 1}`} value={item} path={[...path, index]} onChange={(next) => onChange(value.map((entry, itemIndex) => itemIndex === index ? next : entry))} upload={upload} />
          </div>
        ))}
        <button type="button" className="studio-secondary" onClick={addItem}><Plus size={15} /> Add {titleCase(label).replace(/s$/, '')}</button>
      </fieldset>
    );
  }

  if (value && typeof value === 'object') {
    return (
      <fieldset className="studio-field studio-object">
        <legend>{titleCase(label)}</legend>
        <div className="studio-object-grid">
          {Object.entries(value).map(([childKey, childValue]) => (
            <FieldEditor
              key={childKey}
              label={childKey}
              value={childValue}
              path={[...path, childKey]}
              onChange={(next) => onChange({ ...value, [childKey]: next })}
              upload={upload}
            />
          ))}
        </div>
      </fieldset>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <label className="studio-switch">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        <span aria-hidden="true" />
        <b>{titleCase(label)}</b>
      </label>
    );
  }

  const isLongText = typeof value === 'string' && (value.length > 105 || /summary|lead|intro|description|body|note|text|footer|detail/i.test(label));
  return (
    <div className="studio-field">
      <label htmlFor={inputId}>{titleCase(label)}</label>
      {isLongText ? (
        <textarea id={inputId} rows={4} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input id={inputId} type={typeof value === 'number' ? 'number' : isImage || isAudio ? 'url' : 'text'} value={String(value ?? '')} onChange={(event) => onChange(typeof value === 'number' ? Number(event.target.value) : event.target.value)} />
      )}
      {(isImage || isAudio) && (
        <div className="studio-media-control">
          {isImage && value && <img src={String(value)} alt={`Current ${titleCase(label)}`} />}
          {isAudio && value && <audio controls preload="none" src={String(value)} />}
          <FileUploader label={isAudio ? 'Upload licensed audio' : 'Upload replacement'} image={!isAudio} onUpload={upload} onComplete={onChange} />
        </div>
      )}
    </div>
  );
}

type SettingsEditorProps = {
  site: SiteData;
  updateSite: (next: SiteData) => void;
  dirty: boolean;
  saving: boolean;
  onSave: () => void;
  upload: (file: File) => Promise<string | null>;
};

function SettingsEditor({ site, updateSite, dirty, saving, onSave, upload }: SettingsEditorProps) {
  const sections = useMemo(() => Object.keys(site).filter((key) => !['translations', 'integrations'].includes(key)), [site]);
  const [section, setSection] = useState(() => sections[0] ?? 'home');
  const [language, setLanguage] = useState<Lang>('en');
  const activeSection = sections.includes(section) ? section : sections[0] ?? 'home';
  const sectionData = language === 'ha' ? site.translations?.ha?.[activeSection] ?? {} : site[activeSection] ?? {};
  const rootPath: Path = language === 'ha' ? ['translations', 'ha', activeSection] : [activeSection];

  const change = (relativePath: Path, next: unknown) => {
    updateSite(setAtPath(site, [...rootPath, ...relativePath], next));
  };

  return (
    <section className="studio-panel" aria-label="Website settings editor">
      <div className="studio-panel-heading">
        <div>
          <p className="studio-overline">Site settings</p>
          <h2>Content, identity and public details</h2>
          <p>Change the logo, images, biography, programmes, contact channels and all visitor-facing text here.</p>
        </div>
        <button type="button" className="studio-primary" onClick={onSave} disabled={saving || !dirty}><Save size={17} />{saving ? 'Saving…' : dirty ? 'Save and publish' : 'Saved'}</button>
      </div>
      <div className="studio-filter-row">
        <div className="studio-segmented" aria-label="Content language">
          <button type="button" className={language === 'en' ? 'selected' : ''} onClick={() => setLanguage('en')}><Globe2 size={15} />English</button>
          <button type="button" className={language === 'ha' ? 'selected' : ''} onClick={() => setLanguage('ha')}><Languages size={15} />Hausa</button>
        </div>
        <div className="studio-chip-scroll" role="tablist" aria-label="Website setting section">
          {sections.map((item) => <button type="button" role="tab" aria-selected={activeSection === item} className={activeSection === item ? 'selected' : ''} key={item} onClick={() => setSection(item)}>{titleCase(item)}</button>)}
        </div>
      </div>
      <div className="studio-card studio-settings-card">
        <div className="studio-card-title"><div><p className="studio-overline">{language === 'ha' ? 'Hausa translation' : 'Primary content'}</p><h3>{titleCase(activeSection)}</h3></div><span className={dirty ? 'studio-dirty' : 'studio-saved'}>{dirty ? 'Unsaved changes' : 'Saved'}</span></div>
        <FieldEditor label={activeSection} value={sectionData} path={[]} onChange={(next) => change([], next)} upload={upload} />
      </div>
    </section>
  );
}

type EntriesEditorProps = {
  entries: Entry[];
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  api: (url: string, options?: RequestInit) => Promise<any>;
  upload: (file: File) => Promise<string | null>;
  showNotice: (notice: Notice) => void;
};

function EntriesEditor({ entries, setEntries, api, upload, showNotice }: EntriesEditorProps) {
  const [draft, setDraft] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!draft || !draft.title.trim()) return;
    setSaving(true);
    try {
      await api('/api/admin/content', { method: 'POST', body: JSON.stringify({ action: 'upsert', entry: draft }) });
      const content = await api('/api/admin/content');
      setEntries(content.entries ?? []);
      setDraft(null);
      showNotice({ tone: 'success', text: 'Publication saved. Published entries are now visible on the public site.' });
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save the publication.' });
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Remove this publication permanently?')) return;
    try {
      await api('/api/admin/content', { method: 'POST', body: JSON.stringify({ action: 'delete', id }) });
      setEntries((current) => current.filter((entry) => entry.id !== id));
      showNotice({ tone: 'success', text: 'Publication removed.' });
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not remove the publication.' });
    }
  };

  if (draft) {
    return (
      <section className="studio-panel">
        <div className="studio-panel-heading"><div><p className="studio-overline">Publication editor</p><h2>{draft.id ? 'Edit publication' : 'Create a publication'}</h2></div><button type="button" className="studio-secondary" onClick={() => setDraft(null)}><X size={15} />Cancel</button></div>
        <div className="studio-card studio-entry-form">
          <div className="studio-form-grid">
            <label>Content type<select value={draft.kind} onChange={(event) => setDraft({ ...draft, kind: event.target.value as Entry['kind'] })}><option value="news">News / article</option><option value="social">Social media post</option><option value="achievement">Documented achievement</option></select></label>
            <label>Publication status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Entry['status'] })}><option value="draft">Draft — not public</option><option value="published">Published — public</option></select></label>
          </div>
          <label>Title<input maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
          <label>Short summary<textarea rows={3} value={draft.excerpt} onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })} /></label>
          <label>Full article or description<textarea rows={8} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} /></label>
          <section className="studio-translation-box" aria-labelledby="hausa-publication-title"><div><Languages size={19} /><h3 id="hausa-publication-title">Hausa version</h3></div><p>Hausa text is required before publishing news and documented achievements. Review it with a qualified editor.</p><label>Title (Hausa)<input maxLength={180} value={draft.title_ha ?? ''} onChange={(event) => setDraft({ ...draft, title_ha: event.target.value })} /></label><label>Short summary (Hausa)<textarea rows={3} value={draft.excerpt_ha ?? ''} onChange={(event) => setDraft({ ...draft, excerpt_ha: event.target.value })} /></label><label>Full article or description (Hausa)<textarea rows={8} value={draft.body_ha ?? ''} onChange={(event) => setDraft({ ...draft, body_ha: event.target.value })} /></label></section>
          <div className="studio-form-grid"><label>Platform<select value={draft.platform} onChange={(event) => setDraft({ ...draft, platform: event.target.value })}><option value="">Website / none</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="website">Website</option></select></label><label>Media type<select value={draft.media_type} onChange={(event) => setDraft({ ...draft, media_type: event.target.value })}><option value="post">Post</option><option value="photo">Photo</option><option value="reel">Reel</option><option value="video">Video</option></select></label></div>
          <label>Original source URL<input type="url" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
          <label>Image URL<input type="url" placeholder="https://… or upload below" value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} /></label>
          <div className="studio-media-control">{draft.image ? <img src={draft.image} alt="Publication preview" /> : <div className="studio-image-empty"><ImageIcon size={22} />No image selected</div>}<FileUploader label="Upload image" onUpload={upload} onComplete={(url) => setDraft((current) => current ? { ...current, image: url } : current)} /></div>
          <label>Publication date and time<input type="datetime-local" value={draft.published_at.slice(0, 16)} onChange={(event) => setDraft({ ...draft, published_at: new Date(event.target.value).toISOString() })} /></label>
          <div className="studio-save-row"><button type="button" className="studio-primary" disabled={saving || !draft.title.trim()} onClick={save}><Save size={17} />{saving ? 'Saving…' : 'Save publication'}</button></div>
        </div>
      </section>
    );
  }

  return (
    <section className="studio-panel">
      <div className="studio-panel-heading"><div><p className="studio-overline">Editorial desk</p><h2>News, media and evidence</h2><p>Save items as drafts while they are reviewed; published content appears on the public website.</p></div><button type="button" className="studio-primary" onClick={() => setDraft(blankEntry())}><Plus size={17} />Create publication</button></div>
      <div className="studio-card studio-publication-list">
        {entries.length ? entries.map((entry) => <article className="studio-publication" key={entry.id}><div className="studio-publication-image">{entry.image ? <img src={entry.image} alt="" /> : <FileText size={22} />}</div><div className="studio-publication-copy"><div className="studio-publication-meta"><span className={`studio-status ${entry.status}`}>{entry.status}</span><span>{titleCase(entry.kind)}</span><span>{dateLabel(entry.published_at)}</span></div><h3>{entry.title}</h3><p>{entry.excerpt || 'No summary supplied.'}</p></div><div className="studio-publication-actions"><button type="button" onClick={() => setDraft({ ...entry })} aria-label={`Edit ${entry.title}`}><Edit3 size={16} />Edit</button><button type="button" className="danger" onClick={() => remove(entry.id)} aria-label={`Delete ${entry.title}`}><Trash2 size={16} />Delete</button></div></article>) : <div className="studio-empty"><Newspaper size={28} /><h3>No publications yet</h3><p>Create a draft, add reviewed source material, then publish when ready.</p></div>}
      </div>
    </section>
  );
}

type FacebookIntegrationProps = {
  api: (url: string, options?: RequestInit) => Promise<any>;
  showNotice: (notice: Notice) => void;
  refreshContent: () => Promise<void>;
};

function FacebookIntegration({ api, showNotice, refreshContent }: FacebookIntegrationProps) {
  const [config, setConfig] = useState<FacebookConfig>(defaultFacebook);
  const [state, setState] = useState<FacebookState | null>(null);
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastImported, setLastImported] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [endpointProblem, setEndpointProblem] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api('/api/admin/integrations') as FacebookPayload;
      const facebook = response.facebook ?? {};
      setConfig({ ...defaultFacebook, ...facebook });
      setState({
        lastSyncedAt: facebook.lastSyncedAt,
        lastStatus: facebook.lastStatus,
        lastError: facebook.lastError,
      });
      setTokenConfigured(Boolean(facebook.tokenConfigured));
      setEndpointProblem('');
      setDirty(false);
    } catch (error) {
      setEndpointProblem(error instanceof Error ? error.message : 'Facebook integration settings are not available yet.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { void refresh(); }, [refresh]);

  const change = <K extends keyof FacebookConfig>(key: K, value: FacebookConfig[K]) => {
    setConfig((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const save = async () => {
    setSaving(true);
    try {
      await api('/api/admin/integrations', { method: 'PUT', body: JSON.stringify({ facebook: config }) });
      showNotice({ tone: 'success', text: 'Facebook settings saved. The access token remains securely stored only in Cloudflare.' });
      await refresh();
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save Facebook settings.' });
    } finally {
      setSaving(false);
    }
  };
  const sync = async () => {
    setSyncing(true);
    try {
      const response = await api('/api/admin/facebook-sync', { method: 'POST', body: JSON.stringify({}) }) as FacebookPayload & { state?: FacebookState };
      setState(response.state ?? state);
      setLastImported(response.imported ?? 0);
      showNotice({ tone: 'success', text: `${response.imported ?? 0} Facebook post${response.imported === 1 ? '' : 's'} imported. Review drafts before publishing when automatic publishing is off.` });
      await refreshContent();
      await refresh();
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Facebook sync could not run.' });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="studio-card studio-loading"><RefreshCw className="studio-spin" size={22} />Loading Facebook integration…</div>;

  return (
    <section className="studio-panel">
      <div className="studio-panel-heading"><div><p className="studio-overline">Integrations</p><h2>Facebook Page feed</h2><p>Connect the official Page without placing Meta credentials in the browser. Imported items remain drafts for editorial review.</p></div><button type="button" className="studio-secondary" onClick={() => void refresh()}><RefreshCw size={16} />Refresh status</button></div>
      {endpointProblem ? <div className="studio-card studio-warning"><AlertCircle size={20} /><div><h3>Integration service unavailable</h3><p>{endpointProblem}</p><p>Deploy the updated Pages Functions before configuring the feed.</p></div></div> : <><div className="studio-card studio-facebook-status"><div className="studio-facebook-mark"><Facebook size={28} /></div><div><p className="studio-overline">Connection status</p><h3>{tokenConfigured ? 'Meta credential stored securely' : 'Meta credential not configured'}</h3><p>{tokenConfigured ? 'The Page access token is held in Cloudflare server-side secrets and is never shown here.' : 'Ask the technical administrator to configure FB_PAGE_ACCESS_TOKEN in Cloudflare before syncing.'}</p></div><span className={`studio-state ${tokenConfigured ? 'ready' : 'pending'}`}>{tokenConfigured ? 'Ready for setup' : 'Action needed'}</span></div>
      <div className="studio-card studio-integration-form"><label className="studio-switch"><input type="checkbox" checked={config.enabled} onChange={(event) => change('enabled', event.target.checked)} /><span aria-hidden="true" /><b>Show Facebook content in the website feed</b></label><label>Facebook Page ID<input value={config.pageId} placeholder="e.g. 1234567890" onChange={(event) => change('pageId', event.target.value.trim())} /></label><label>Official Facebook Page URL<input type="url" value={config.pageUrl} placeholder="https://www.facebook.com/yourpage" onChange={(event) => change('pageUrl', event.target.value)} /></label><div className="studio-form-grid"><label className="studio-switch"><input type="checkbox" checked={config.autoPublish} onChange={(event) => change('autoPublish', event.target.checked)} /><span aria-hidden="true" /><b>Publish imported posts automatically</b></label><label>Scheduled sync frequency<select value={config.syncIntervalMinutes} onChange={(event) => change('syncIntervalMinutes', Number(event.target.value))}><option value={15}>Every 15 minutes</option><option value={30}>Every 30 minutes</option><option value={60}>Every hour</option><option value={120}>Every 2 hours</option><option value={360}>Every 6 hours</option></select></label></div><div className="studio-inline-note"><ShieldCheck size={18} /><p>Only connect an official Page you are authorised to manage. Leave automatic publishing off unless an editor has approved the campaign’s publishing policy.</p></div><div className="studio-save-row"><button type="button" className="studio-primary" disabled={saving || !dirty} onClick={save}><Save size={17} />{saving ? 'Saving…' : dirty ? 'Save integration' : 'Settings saved'}</button><button type="button" className="studio-secondary" disabled={syncing || !config.enabled || !tokenConfigured || dirty} onClick={sync}><Radio size={17} />{syncing ? 'Syncing…' : 'Sync now'}</button></div></div>
      <div className="studio-card studio-sync-log"><div className="studio-card-title"><div><p className="studio-overline">Sync activity</p><h3>Facebook feed status</h3></div><span className={`studio-state ${state?.lastStatus === 'error' ? 'error' : 'ready'}`}>{state?.lastStatus ?? 'Not configured'}</span></div><dl><div><dt>Last completed</dt><dd>{dateLabel(state?.lastSyncedAt)}</dd></div><div><dt>Latest manual import</dt><dd>{lastImported === null ? '—' : `${lastImported} posts`}</dd></div><div><dt>Publishing mode</dt><dd>{config.autoPublish ? 'Automatic' : 'Editorial review'}</dd></div></dl>{state?.lastError && <p className="studio-error-text"><AlertCircle size={16} />{state.lastError}</p>}</div></>}</section>
  );
}

export function AdminStudio({ go }: { go: (path: string) => void }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('sodangi-local-token') ?? '');
  const [localToken, setLocalToken] = useState('');
  const [authMode, setAuthMode] = useState<AdminAuthMode>('access');
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const csrfToken = useRef('');
  const [site, setSite] = useState<SiteData | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const headers = useCallback(() => token ? { 'X-Local-Admin-Key': token } : {}, [token]);
  const api = useCallback(async (url: string, options: RequestInit = {}) => {
    const requestHeaders = new Headers(options.headers);
    Object.entries(headers()).forEach(([key, value]) => requestHeaders.set(key, value));
    const method = (options.method || 'GET').toUpperCase();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken.current) requestHeaders.set('X-Admin-CSRF', csrfToken.current);
    if (options.body && !(options.body instanceof FormData) && !requestHeaders.has('content-type')) requestHeaders.set('content-type', 'application/json');
    const response = await fetch(url, {
      ...options,
      headers: requestHeaders,
      credentials: 'same-origin',
    });
    const data = await response.json().catch(() => ({ error: 'Unexpected server response' }));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }, [headers]);

  const readAuthConfig = useCallback(async (): Promise<AdminAuthConfig> => {
    const data = await api('/api/admin/auth/config');
    return { mode: data?.mode === 'password' ? 'password' : 'access', passwordConfigured: data?.passwordConfigured === true };
  }, [api]);

  const checkPasswordSession = useCallback(async () => {
    const data = await api('/api/admin/auth/session');
    if (data?.authenticated === true && typeof data.csrfToken === 'string') {
      csrfToken.current = data.csrfToken;
      return true;
    }
    csrfToken.current = '';
    return false;
  }, [api]);

  const loadDashboard = useCallback(async () => {
    const [siteResponse, contentResponse, statusResponse] = await Promise.all([
      api('/api/admin/site'),
      api('/api/admin/content'),
      api('/api/admin/status'),
    ]);
    setSite(ensureTranslations(siteResponse.site));
    setEntries(contentResponse.entries ?? []);
    setStatus(statusResponse);
    setDirty(false);
  }, [api]);

  const load = useCallback(async () => {
    setChecking(true);
    setAuthError('');
    try {
      const config = await readAuthConfig();
      setAuthMode(config.mode);
      setPasswordConfigured(config.passwordConfigured);
      if (config.mode === 'password') {
        if (!config.passwordConfigured) {
          setSite(null);
          setAuthError('Password sign-in has not been configured on this deployment yet.');
          return;
        }
        const signedIn = await checkPasswordSession();
        if (!signedIn) {
          // A loopback-only local token remains useful while developing, even
          // when password mode has been enabled for production.
          if (token) {
            try {
              await loadDashboard();
              return;
            } catch {
              // The screen below explains the appropriate production sign-in.
            }
          }
          setSite(null);
          return;
        }
      } else {
        csrfToken.current = '';
      }
      await loadDashboard();
    } catch (error) {
      setSite(null);
      setAuthError(error instanceof Error ? error.message : 'Secure administrator access could not be verified.');
    } finally {
      setChecking(false);
    }
  }, [checkPasswordSession, loadDashboard, readAuthConfig, token]);

  useEffect(() => { void load(); }, [load]);

  const showNotice = (next: Notice) => setNotice(next);
  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSigningIn(true);
    setAuthError('');
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({ error: 'Unexpected server response' }));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (typeof data.csrfToken !== 'string') throw new Error('Secure sign-in could not be completed.');
      csrfToken.current = data.csrfToken;
      setPassword('');
      await loadDashboard();
    } catch (error) {
      setSite(null);
      setAuthError(error instanceof Error ? error.message : 'Secure sign-in could not be completed.');
    } finally {
      setSigningIn(false);
    }
  };
  const signOut = async () => {
    if (authMode !== 'password') {
      sessionStorage.removeItem('sodangi-local-token');
      setToken('');
      window.location.reload();
      return;
    }
    try {
      const response = await fetch('/api/admin/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Admin-CSRF': csrfToken.current },
      });
      const data = await response.json().catch(() => ({ error: 'Unexpected server response' }));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      csrfToken.current = '';
      window.location.reload();
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not sign out safely.' });
    }
  };
  const upload = async (file: File): Promise<string | null> => {
    try {
      const body = new FormData();
      body.append('file', file);
      const result = await api('/api/admin/upload', { method: 'POST', body });
      showNotice({ tone: 'success', text: 'Media uploaded. Save the relevant content to publish it.' });
      return result.url;
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Upload failed.' });
      return null;
    }
  };
  const saveSite = async () => {
    if (!site) return;
    setSaving(true);
    try {
      await api('/api/admin/site', { method: 'PUT', body: JSON.stringify(site) });
      setDirty(false);
      showNotice({ tone: 'success', text: 'Website settings saved and published.' });
    } catch (error) {
      showNotice({ tone: 'error', text: error instanceof Error ? error.message : 'Could not save website settings.' });
    } finally {
      setSaving(false);
    }
  };
  const refreshContent = async () => {
    const content = await api('/api/admin/content');
    setEntries(content.entries ?? []);
  };

  if (checking) return <div className="studio-loading-screen"><RefreshCw className="studio-spin" size={30} /><h1>Checking secure admin access…</h1></div>;
  if (!site) return <div className="studio-lock-screen"><section className="studio-lock-card"><LockKeyhole size={38} /><p className="studio-overline">Private content studio</p><h1>Administrator sign-in required</h1>{authMode === 'password' ? <>{passwordConfigured ? <><p>Use the administrator password stored as a Cloudflare secret. It is never saved in this browser.</p>{authError && <p className="studio-error-text"><AlertCircle size={16} />{authError}</p>}<form className="studio-password-form" onSubmit={(event) => void signInWithPassword(event)}><label>Administrator password<input type="password" autoComplete="current-password" minLength={16} maxLength={1024} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><button type="submit" className="studio-primary" disabled={signingIn || !password}>{signingIn ? <RefreshCw className="studio-spin" size={16} /> : <LockKeyhole size={16} />}{signingIn ? 'Signing in…' : 'Sign in securely'}</button></form><button type="button" className="studio-text-button" onClick={() => void load()}><RefreshCw size={16} />Check sign-in again</button></> : <><p>Password sign-in is selected but is not ready. The database migration and three Cloudflare secrets must be completed before anyone can use this dashboard.</p>{authError && <p className="studio-error-text"><AlertCircle size={16} />{authError}</p>}<button type="button" className="studio-primary" onClick={() => void load()}><RefreshCw size={16} />Check configuration again</button></>}</> : <><p>Cloudflare Access controls this production sign-in. Sign in with an approved editor account, then retry.</p>{authError && <p className="studio-error-text"><AlertCircle size={16} />{authError}</p>}<button type="button" className="studio-primary" onClick={() => void load()}><RefreshCw size={16} />Retry secure sign-in</button></>}<details><summary>Developing locally with Wrangler?</summary><p>Enter the local development token configured in root <code>.dev.vars</code>. It is rejected on public deployments.</p><input type="password" autoComplete="off" placeholder="Local development token" value={localToken} onChange={(event) => setLocalToken(event.target.value)} /><button type="button" className="studio-secondary" disabled={!localToken} onClick={() => { sessionStorage.setItem('sodangi-local-token', localToken); setToken(localToken); }}>Use local token</button></details><button type="button" className="studio-text-button" onClick={() => go('/')}>Return to public website</button></section></div>;

  const navigation: Array<[Tab, string, typeof LayoutDashboard]> = [
    ['overview', 'Overview', LayoutDashboard],
    ['site', 'Website settings', Layers],
    ['entries', 'News & stories', Newspaper],
    ['integrations', 'Integrations', Settings2],
    ['operations', 'Operations', ShieldCheck],
  ];
  const headings: Record<Tab, string> = { overview: 'Dashboard', site: 'Website settings', entries: 'News & stories', integrations: 'Integrations', operations: 'Operations' };
  const published = entries.filter((entry) => entry.status === 'published').length;
  const drafts = entries.filter((entry) => entry.status === 'draft').length;

  return <div className="studio-app"><aside className="studio-sidebar"><div className="studio-brand"><img src="/assets/logo.jpg" alt="Sodangi logo" /><span>CONTENT STUDIO<small>PRIVATE ADMINISTRATION</small></span></div><nav aria-label="Admin dashboard sections">{navigation.map(([key, label, Icon]) => <button type="button" key={key} className={tab === key ? 'selected' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => { setTab(key); setNotice(null); }}><Icon size={18} />{label}</button>)}</nav><div className="studio-sidebar-footer"><a href="/" target="_blank" rel="noopener noreferrer"><Eye size={16} />Preview public site</a><button type="button" onClick={() => void signOut()}><LogOut size={16} />{authMode === 'password' ? 'Sign out' : 'Reset local access'}</button></div></aside><main className="studio-main"><header className="studio-topbar"><div><p className="studio-overline">Sodangi 2027</p><h1>{headings[tab]}</h1></div><span className="studio-admin-chip"><LockKeyhole size={15} />{status?.actor ?? 'Administrator'}</span></header>{notice && <div className={`studio-notice ${notice.tone}`} role="status"><>{notice.tone === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}</><span>{notice.text}</span><button type="button" aria-label="Dismiss message" onClick={() => setNotice(null)}><X size={15} /></button></div>}
    {tab === 'overview' && <section className="studio-panel"><div className="studio-stat-grid"><article><span>Published</span><b>{published}</b><small>Public stories</small></article><article><span>Drafts</span><b>{drafts}</b><small>Awaiting review</small></article><article><span>Subscribers</span><b>{status?.subscribers ?? 0}</b><small>Confirmed emails</small></article><article><span>Media storage</span><b>{status?.mediaStorage ? 'Ready' : '—'}</b><small>{status?.mediaStorage ? 'R2 connected' : 'Not configured'}</small></article></div><div className="studio-grid-two"><section className="studio-card"><p className="studio-overline">Start here</p><h2>Keep the public story current</h2><p>Update the homepage, biography, campaign identity or contact links; then publish news only after the source and Hausa copy are reviewed.</p><div className="studio-actions"><button type="button" className="studio-primary" onClick={() => setTab('entries')}><Plus size={16} />New publication</button><button type="button" className="studio-secondary" onClick={() => setTab('site')}><Edit3 size={16} />Edit website</button></div></section><section className="studio-card"><p className="studio-overline">Readiness</p><h2>Connection checks</h2><dl className="studio-definition-list"><div><dt><Database size={16} />D1 content database</dt><dd>Connected</dd></div><div><dt><ImageIcon size={16} />Media uploads</dt><dd>{status?.mediaStorage ? 'Configured' : 'Needs R2 binding'}</dd></div><div><dt><Mail size={16} />Newsletter mailer</dt><dd>{status?.emailReady ? 'Configured' : 'Not configured'}</dd></div></dl></section></div><section className="studio-card"><p className="studio-overline">Recent editorial actions</p><h2>Audit trail</h2>{status?.audit?.length ? <ol className="studio-audit">{status.audit.map((record: any, index: number) => <li key={`${record.created_at}-${index}`}><span>{record.action}: <strong>{record.target}</strong></span><small>{record.actor} · {dateLabel(record.created_at)}</small></li>)}</ol> : <p>No editorial actions have been recorded yet.</p>}</section></section>}
    {tab === 'site' && <SettingsEditor site={site} updateSite={(next: SiteData) => { setSite(next); setDirty(true); }} dirty={dirty} saving={saving} onSave={() => void saveSite()} upload={upload} />}
    {tab === 'entries' && <EntriesEditor entries={entries} setEntries={setEntries} api={api} upload={upload} showNotice={showNotice} />}
    {tab === 'integrations' && <FacebookIntegration api={api} showNotice={showNotice} refreshContent={refreshContent} />}
    {tab === 'operations' && <section className="studio-panel"><div className="studio-panel-heading"><div><p className="studio-overline">Launch operations</p><h2>Security, editorial workflow and deployment</h2><p>Use this page as the operating checklist before publishing campaign content.</p></div></div><div className="studio-grid-two"><section className="studio-card"><ShieldCheck size={25} /><h2>Protect administration</h2><p>{authMode === 'password' ? 'Password mode uses a server-only secret, an 8-hour secure session, sign-out, CSRF checks and login throttling. Keep the password unique and share it only with the trusted owner.' : <>Cloudflare Access must protect <code>/admin*</code> and <code>/api/admin/*</code> on every production and preview hostname. Use MFA and a named-email allowlist.</>}</p></section><section className="studio-card"><Radio size={25} /><h2>Publish responsibly</h2><p>Keep claims, names, figures, translations and social feeds in draft until a designated editor has reviewed the source material.</p></section><section className="studio-card"><Globe2 size={25} /><h2>Before launch</h2><p>Approve the privacy notice, contact details, social accounts, newsletter sender and Hausa copy. Test on a phone and in an unauthorised browser session.</p></section><section className="studio-card"><FileText size={25} /><h2>Backups and rollback</h2><p>Export D1 regularly, retain approved source assets, and use a Pages preview before merging changes into the production branch.</p></section></div></section>}
  </main></div>;
}
