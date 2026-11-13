'use client';

import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Check,
  CreditCard,
  Image as ImageIcon,
  Layers,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import { formatCredits } from '@/lib/credit-rules';
import { formatDateTime } from '@/lib/format';

const TABS = [
  { id: 'overview', label: 'İcmal', icon: BarChart3 },
  { id: 'orders', label: 'Sifarişlər', icon: CreditCard },
  { id: 'users', label: 'İstifadəçilər', icon: Users },
  { id: 'generations', label: 'Generasiyalar', icon: Activity },
  { id: 'plans', label: 'Planlar', icon: Layers },
  { id: 'showcase', label: 'Showcase', icon: Video },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
];

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;
const fmtDate = (value) => formatDateTime(value);

const mapPlanDrafts = (plans) => plans.map((plan) => ({
  ...plan,
  price: (plan.price_cents || plan.priceCents || 0) / 100,
  credits: plan.credits,
  featuresText: (plan.features || []).join('\n'),
}));

const mapSettingsDraft = (settings) => ({
  muapiKey: '',
  clearKey: false,
  providerBudget: Number(settings.providerBudgetCents || 0) / 100,
  signupCredits: settings.signupCredits || 0,
  refBonusCredits: settings.refBonusCredits || 0,
  demoCheckout: Boolean(settings.demoCheckout),
  announcement: settings.announcement || '',
  manualPayment: settings.manualPayment || '',
});

export function AdminClient({ initialData }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [creditDrafts, setCreditDrafts] = useState({});
  const [plansDraft, setPlansDraft] = useState(() => mapPlanDrafts(initialData.plans));
  const [settingsDraft, setSettingsDraft] = useState(() => mapSettingsDraft(initialData.settings));
  const [showcaseDraft, setShowcaseDraft] = useState({
    id: '',
    title: '',
    category: 'video',
    model: '',
    videoUrl: '',
    posterUrl: '',
    likes: 0,
    sort: 0,
    active: true,
  });

  const load = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/admin/overview');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Yüklənmədi.');
      setData(payload);
      setPlansDraft(mapPlanDrafts(payload.plans));
      setSettingsDraft(mapSettingsDraft(payload.settings));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!notice && !error) return undefined;
    const timer = setTimeout(() => {
      setNotice(null);
      setError(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [notice, error]);

  const request = async (url, options = {}) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Əməliyyat alınmadı.');
      return payload;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const reload = async () => {
    const response = await fetch('/api/admin/overview');
    const payload = await response.json();
    if (response.ok) {
      setData(payload);
      setPlansDraft(mapPlanDrafts(payload.plans));
      setSettingsDraft(mapSettingsDraft(payload.settings));
    }
  };

  const orderAction = async (order, action) => {
    const note = window.prompt(
      action === 'approve' ? 'Təsdiq qeydi (istəyə bağlı):' : 'Rədd səbəbi (istəyə bağlı):',
      '',
    );
    if (note === null) return;
    const result = await request(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action, note }),
    });
    if (result) {
      setNotice(action === 'approve' ? `${order.id} təsdiqləndi, kreditlər yükləndi.` : `${order.id} rədd edildi.`);
      await reload();
    }
  };

  const adjustCredits = async (user, sign) => {
    const raw = creditDrafts[user.id] ?? 100;
    const amount = Math.abs(Number(raw));
    if (!amount) return;
    const result = await request(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'credits',
        amount: sign * amount,
        note: sign > 0 ? 'Admin kredit əlavə etdi' : 'Admin kredit çıxdı',
      }),
    });
    if (result) {
      setNotice(`${user.email}: ${sign > 0 ? '+' : '−'}${amount} kredit.`);
      await reload();
    }
  };

  const setRole = async (user, role) => {
    const result = await request(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'role', role }),
    });
    if (result) {
      setNotice(`${user.email} → ${role}`);
      await reload();
    }
  };

  const setStatus = async (user, status) => {
    const result = await request(`/api/admin/users/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'status', status }),
    });
    if (result) {
      setNotice(`${user.email} → ${status}`);
      await reload();
    }
  };

  const savePlans = async () => {
    const payload = {
      plans: plansDraft.map((plan) => ({
        id: plan.id,
        name: plan.name,
        tagline: plan.tagline || '',
        priceCents: Math.round(Number(plan.price) * 100),
        credits: Math.round(Number(plan.credits)),
        features: String(plan.featuresText || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        popular: Boolean(plan.popular),
        active: plan.active !== false,
        sort: Number(plan.sort || 0),
      })),
    };
    const result = await request('/api/admin/plans', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (result) {
      setNotice('Planlar yeniləndi.');
      await reload();
    }
  };

  const saveSettings = async () => {
    const payload = {
      clearKey: settingsDraft.clearKey,
      providerBudgetCents: Math.round(Number(settingsDraft.providerBudget) * 100),
      signupCredits: Number(settingsDraft.signupCredits),
      refBonusCredits: Number(settingsDraft.refBonusCredits),
      demoCheckout: Boolean(settingsDraft.demoCheckout),
      announcement: settingsDraft.announcement,
      manualPayment: settingsDraft.manualPayment,
    };
    if (settingsDraft.muapiKey.trim()) payload.muapiKey = settingsDraft.muapiKey.trim();
    const result = await request('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (result) {
      setNotice('Ayarlar saxlanıldı.');
      setSettingsDraft((previous) => ({ ...previous, muapiKey: '', clearKey: false }));
      await reload();
    }
  };

  const syncBalance = async () => {
    const result = await request('/api/admin/sync-balance', { method: 'POST' });
    if (result) {
      setNotice('MuAPI balansı sinxronlaşdırıldı.');
      await reload();
    }
  };

  const saveShowcase = async () => {
    const payload = {
      id: showcaseDraft.id || undefined,
      title: showcaseDraft.title,
      category: showcaseDraft.category,
      model: showcaseDraft.model,
      videoUrl: showcaseDraft.videoUrl,
      posterUrl: showcaseDraft.posterUrl,
      likes: Number(showcaseDraft.likes || 0),
      sort: Number(showcaseDraft.sort || 0),
      active: showcaseDraft.active,
    };
    const result = await request('/api/admin/showcase', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (result) {
      setNotice('Showcase yeniləndi.');
      setShowcaseDraft({ id: '', title: '', category: 'video', model: '', videoUrl: '', posterUrl: '', likes: 0, sort: 0, active: true });
      await reload();
    }
  };

  const deleteShowcase = async (id) => {
    if (!window.confirm('Bu showcase kartını silmək istəyirsiniz?')) return;
    const result = await request(`/api/admin/showcase?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (result) {
      setNotice('Kart silindi.');
      await reload();
    }
  };

  const stats = data.stats;
  const poolPercent = stats.providerBudget
    ? Math.min(100, Math.round((stats.providerSpent / stats.providerBudget) * 100))
    : 0;

  return (
    <div className="admin-wrap">
      <aside className="admin-nav">
        {TABS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              <Icon size={14} /> {item.label}
            </button>
          );
        })}
      </aside>

      <div className="admin-content">
        <div className="between">
          <div>
            <span className="eyebrow"><Shield size={12} /> Admin</span>
            <h1 style={{ fontSize: 30, marginTop: 10 }}>{TABS.find((item) => item.id === tab)?.label}</h1>
          </div>
          <button type="button" className="btn btn-sm" onClick={load} disabled={busy}>
            {busy ? <Loader2 size={13} className="spinner" /> : <RefreshCw size={13} />} Yenilə
          </button>
        </div>

        {error ? <div className="form-error mt-2">{error}</div> : null}
        {notice ? <div className="form-success mt-2">{notice}</div> : null}

        {tab === 'overview' ? (
          <>
            <div className="admin-cards mt-3">
              <div className="admin-card"><span>Gəlir</span><b>{money(stats.revenue)}</b><small>{stats.pendingOrders} gözləyən sifariş</small></div>
              <div className="admin-card"><span>İstifadəçi</span><b>{formatCredits(stats.userCount)}</b><small>+{stats.newUsers} son 7 gün</small></div>
              <div className="admin-card"><span>Generasiya</span><b>{formatCredits(stats.generationCount)}</b><small>{stats.successRate}% uğur</small></div>
              <div className="admin-card"><span>Dövriyyədə kredit</span><b>{formatCredits(stats.creditsOutstanding)}</b><small>{formatCredits(stats.completed)} tamamlanıb</small></div>
            </div>

            <div className="admin-section-head">
              <h2>Paylaşımlı MuAPI pool</h2>
              <button type="button" className="btn btn-sm" onClick={syncBalance} disabled={busy}>
                <RefreshCw size={12} /> Balansı sinxronlaşdır
              </button>
            </div>
            <div className="panel">
              <div className="panel-body">
                <div className="between">
                  <span className="muted small">İstifadə olunan təxmini provider xərci</span>
                  <b>{money(stats.providerSpent)} / {money(stats.providerBudget)}</b>
                </div>
                <div className="progress mt-2"><i style={{ width: `${poolPercent}%` }} /></div>
                <div className="row wrap mt-2" style={{ gap: 8 }}>
                  <span className="micro-tag">{poolPercent}% istifadə</span>
                  <span className="micro-tag">{money(stats.providerBudget - stats.providerSpent)} qalıq</span>
                  {data.settings.muapiBalance ? (
                    <span className="micro-tag">API balans: {JSON.stringify(data.settings.muapiBalance).slice(0, 80)}</span>
                  ) : null}
                  {data.settings.muapiBalanceAt ? (
                    <span className="micro-tag">Sync: {fmtDate(data.settings.muapiBalanceAt)}</span>
                  ) : null}
                </div>
                {!data.settings.muapiKeySet ? (
                  <div className="admin-note mt-2">
                    MuAPI açarı hələ qoşulmayıb. Ayarlar bölməsindən açarı əlavə edin —
                    istifadəçilər generasiya edə bilməyəcək.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="admin-section-head"><h2>Ən çox istifadə olunan modellər</h2></div>
            <div className="panel">
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Model</th><th>Tip</th><th>Say</th><th>Kredit</th></tr></thead>
                  <tbody>
                    {data.topModels.map((model) => (
                      <tr key={`${model.category}-${model.model_id}`}>
                        <td>{model.model_name}</td>
                        <td>{model.category}</td>
                        <td>{model.count}</td>
                        <td>{formatCredits(model.credits)}</td>
                      </tr>
                    ))}
                    {!data.topModels.length ? <tr><td colSpan={4}>Hələ generasiya yoxdur.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}

        {tab === 'orders' ? (
          <div className="panel mt-3">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Sifariş</th><th>İstifadəçi</th><th>Plan</th><th>Məbləğ</th><th>Kredit</th><th>Status</th><th>Tarix</th><th>Əməliyyat</th></tr></thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id}>
                      <td className="mono">{order.id}</td>
                      <td>{order.user_email}</td>
                      <td>{order.plan_name}</td>
                      <td>{money(order.amount_cents)}</td>
                      <td>{formatCredits(order.credits)}</td>
                      <td><span className={`status ${order.status}`}>{order.status}</span></td>
                      <td>{fmtDate(order.created_at)}</td>
                      <td>
                        {order.status === 'pending' ? (
                          <div className="admin-actions">
                            <button type="button" className="btn btn-sm" onClick={() => orderAction(order, 'approve')} disabled={busy}>
                              <Check size={11} /> Təsdiq
                            </button>
                            <button type="button" className="btn btn-sm btn-danger" onClick={() => orderAction(order, 'reject')} disabled={busy}>
                              <X size={11} /> Rədd
                            </button>
                          </div>
                        ) : (
                          <span className="tiny muted">{order.note || '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!data.orders.length ? <tr><td colSpan={8}>Sifariş yoxdur.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'users' ? (
          <div className="panel mt-3">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>İstifadəçi</th><th>Rol</th><th>Plan</th><th>Kredit</th><th>Gen.</th><th>Xərc</th><th>Status</th><th>Əməliyyat</th></tr></thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <b style={{ color: 'var(--text)' }}>{user.name}</b>
                        <div className="tiny muted">{user.email}</div>
                      </td>
                      <td>{user.role}</td>
                      <td>{data.plans.find((plan) => plan.id === user.plan_id)?.name || '—'}</td>
                      <td>{formatCredits(user.credits)}</td>
                      <td>{user.generation_count}</td>
                      <td>{money(user.spent_cents)}</td>
                      <td><span className={`status ${user.status}`}>{user.status}</span></td>
                      <td>
                        <div className="admin-actions" style={{ alignItems: 'center' }}>
                          <input
                            className="mini-input"
                            type="number"
                            value={creditDrafts[user.id] ?? 100}
                            onChange={(event) => setCreditDrafts((previous) => ({ ...previous, [user.id]: event.target.value }))}
                            aria-label="Kredit məbləği"
                          />
                          <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => adjustCredits(user, 1)} title="Kredit əlavə et">
                            +
                          </button>
                          <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => adjustCredits(user, -1)} title="Kredit çıx">
                            −
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setRole(user, user.role === 'admin' ? 'user' : 'admin')}
                          >
                            {user.role === 'admin' ? 'User et' : 'Admin et'}
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${user.status === 'active' ? 'btn-danger' : ''}`}
                            onClick={() => setStatus(user, user.status === 'active' ? 'blocked' : 'active')}
                          >
                            {user.status === 'active' ? 'Blokla' : 'Aktiv et'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'generations' ? (
          <div className="panel mt-3">
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Model</th><th>İstifadəçi</th><th>Tip</th><th>Kredit</th><th>Provider xərc</th><th>Status</th><th>Tarix</th></tr></thead>
                <tbody>
                  {data.generations.map((item) => (
                    <tr key={item.id}>
                      <td>{item.model_name}</td>
                      <td>{item.user_email}</td>
                      <td>{item.category}</td>
                      <td>{formatCredits(item.cost)}</td>
                      <td>{money(item.provider_cost_cents)}</td>
                      <td><span className={`status ${item.status}`}>{item.status}</span></td>
                      <td>{fmtDate(item.created_at)}</td>
                    </tr>
                  ))}
                  {!data.generations.length ? <tr><td colSpan={7}>Generasiya yoxdur.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === 'plans' ? (
          <>
            <div className="stack mt-3">
              {plansDraft.map((plan, index) => (
                <div className="panel" key={plan.id}>
                  <div className="panel-head">
                    <h3>{plan.name || plan.id}</h3>
                    <div className="row" style={{ gap: 10 }}>
                      <label className="tiny muted row" style={{ gap: 5 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(plan.popular)}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, popular: event.target.checked } : item))}
                        />
                        Populyar
                      </label>
                      <label className="tiny muted row" style={{ gap: 5 }}>
                        <input
                          type="checkbox"
                          checked={plan.active !== false}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, active: event.target.checked } : item))}
                        />
                        Aktiv
                      </label>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="admin-form">
                      <div className="field">
                        <label>Ad</label>
                        <input
                          value={plan.name}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, name: event.target.value } : item))}
                        />
                      </div>
                      <div className="field">
                        <label>Qiymət ($)</label>
                        <input
                          type="number"
                          value={plan.price}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, price: event.target.value } : item))}
                        />
                      </div>
                      <div className="field">
                        <label>Kredit</label>
                        <input
                          type="number"
                          value={plan.credits}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, credits: event.target.value } : item))}
                        />
                      </div>
                      <div className="field">
                        <label>Tagline</label>
                        <input
                          value={plan.tagline || ''}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, tagline: event.target.value } : item))}
                        />
                      </div>
                      <div className="field full">
                        <label>Xüsusiyyətlər (hər sətirdə bir)</label>
                        <textarea
                          value={plan.featuresText}
                          onChange={(event) => setPlansDraft((previous) => previous.map((item, i) => i === index ? { ...item, featuresText: event.target.value } : item))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary mt-2" onClick={savePlans} disabled={busy}>
              <Save size={14} /> Planları saxla
            </button>
          </>
        ) : null}

        {tab === 'showcase' ? (
          <>
            <div className="panel mt-3">
              <div className="panel-head"><h3>Showcase kartları</h3><span className="tiny muted">{data.showcase.length}</span></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Başlıq</th><th>Tip</th><th>Model</th><th>Like</th><th>Aktiv</th><th>Əməliyyat</th></tr></thead>
                  <tbody>
                    {data.showcase.map((item) => (
                      <tr key={item.id}>
                        <td>{item.title}</td>
                        <td>{item.category}</td>
                        <td>{item.model || '—'}</td>
                        <td>{formatCredits(item.likes)}</td>
                        <td>{item.active ? 'Bəli' : 'Xeyr'}</td>
                        <td>
                          <div className="admin-actions">
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: 28, height: 28 }}
                              onClick={() => setShowcaseDraft({
                                id: item.id,
                                title: item.title,
                                category: item.category,
                                model: item.model || '',
                                videoUrl: item.video_url || '',
                                posterUrl: item.poster_url || '',
                                likes: item.likes,
                                sort: item.sort,
                                active: Boolean(item.active),
                              })}
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ width: 28, height: 28 }}
                              onClick={() => deleteShowcase(item.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel mt-2">
              <div className="panel-head"><h3>{showcaseDraft.id ? 'Kartı redaktə et' : 'Yeni kart'}</h3></div>
              <div className="panel-body">
                <div className="admin-form">
                  <div className="field"><label>Başlıq</label><input value={showcaseDraft.title} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, title: e.target.value })} /></div>
                  <div className="field">
                    <label>Tip</label>
                    <select value={showcaseDraft.category} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, category: e.target.value })}>
                      <option value="video">video</option>
                      <option value="image">image</option>
                    </select>
                  </div>
                  <div className="field"><label>Model</label><input value={showcaseDraft.model} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, model: e.target.value })} /></div>
                  <div className="field"><label>Video URL</label><input value={showcaseDraft.videoUrl} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, videoUrl: e.target.value })} placeholder="/showcase/neon.mp4" /></div>
                  <div className="field"><label>Poster URL</label><input value={showcaseDraft.posterUrl} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, posterUrl: e.target.value })} placeholder="/showcase/neon.jpg" /></div>
                  <div className="field"><label>Like sayı</label><input type="number" value={showcaseDraft.likes} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, likes: e.target.value })} /></div>
                  <div className="field"><label>Sıra</label><input type="number" value={showcaseDraft.sort} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, sort: e.target.value })} /></div>
                  <div className="field">
                    <label>Status</label>
                    <label className="row" style={{ gap: 7, fontSize: 12 }}>
                      <input type="checkbox" checked={showcaseDraft.active} onChange={(e) => setShowcaseDraft({ ...showcaseDraft, active: e.target.checked })} />
                      Aktiv
                    </label>
                  </div>
                </div>
                <div className="row mt-2">
                  <button type="button" className="btn btn-primary" onClick={saveShowcase} disabled={busy || !showcaseDraft.title}>
                    <Save size={14} /> Saxla
                  </button>
                  {showcaseDraft.id ? (
                    <button type="button" className="btn" onClick={() => setShowcaseDraft({ id: '', title: '', category: 'video', model: '', videoUrl: '', posterUrl: '', likes: 0, sort: 0, active: true })}>
                      Ləğv et
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </>
        ) : null}

        {tab === 'settings' ? (
          <div className="panel mt-3">
            <div className="panel-body">
              <div className="admin-note mb-2">
                MuAPI açarı serverdə saxlanılır və brauzerə heç vaxt göndərilmir.
                Açarı dəyişmək üçün yeni açarı yazın; boş buraxsanız mövcud açar qalır.
              </div>
              <div className="admin-form">
                <div className="field full">
                  <label>MuAPI API açarı {data.settings.muapiKeySet ? `(mövcud: ${data.settings.muapiKeyPreview})` : '(qoşulmayıb)'}</label>
                  <input
                    value={settingsDraft.muapiKey}
                    onChange={(e) => setSettingsDraft({ ...settingsDraft, muapiKey: e.target.value })}
                    placeholder="x-api-key"
                    autoComplete="off"
                  />
                </div>
                <div className="field">
                  <label>Pool büdcəsi ($)</label>
                  <input type="number" value={settingsDraft.providerBudget} onChange={(e) => setSettingsDraft({ ...settingsDraft, providerBudget: e.target.value })} />
                </div>
                <div className="field">
                  <label>Qeydiyyat bonusu (kredit)</label>
                  <input type="number" value={settingsDraft.signupCredits} onChange={(e) => setSettingsDraft({ ...settingsDraft, signupCredits: e.target.value })} />
                </div>
                <div className="field">
                  <label>Referral bonusu (kredit)</label>
                  <input type="number" value={settingsDraft.refBonusCredits} onChange={(e) => setSettingsDraft({ ...settingsDraft, refBonusCredits: e.target.value })} />
                </div>
                <div className="field">
                  <label>Demo checkout</label>
                  <label className="row" style={{ gap: 7, fontSize: 12, minHeight: 44 }}>
                    <input type="checkbox" checked={settingsDraft.demoCheckout} onChange={(e) => setSettingsDraft({ ...settingsDraft, demoCheckout: e.target.checked })} />
                    Plan alışını dərhal təsdiqlə
                  </label>
                </div>
                <div className="field full">
                  <label>Elan (header-də görünür)</label>
                  <input value={settingsDraft.announcement} onChange={(e) => setSettingsDraft({ ...settingsDraft, announcement: e.target.value })} />
                </div>
                <div className="field full">
                  <label>Manual ödəniş təlimatları</label>
                  <textarea value={settingsDraft.manualPayment} onChange={(e) => setSettingsDraft({ ...settingsDraft, manualPayment: e.target.value })} />
                </div>
              </div>
              <div className="row mt-2 wrap">
                <button type="button" className="btn btn-primary" onClick={saveSettings} disabled={busy}>
                  <Save size={14} /> Ayarları saxla
                </button>
                <button type="button" className="btn" onClick={syncBalance} disabled={busy || !data.settings.muapiKeySet}>
                  <RefreshCw size={13} /> Balansı sinxronlaşdır
                </button>
                {data.settings.muapiKeySet ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      if (window.confirm('MuAPI açarını silmək istəyirsiniz?')) {
                        setSettingsDraft({ ...settingsDraft, clearKey: true, muapiKey: '' });
                      }
                    }}
                  >
                    Açarı sil
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
