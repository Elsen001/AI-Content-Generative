'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Upload,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { estimateCredits, formatCredits } from '@/lib/credit-rules';

const MODES = {
  image: [
    { id: 'text-to-image', label: 'Mətndən şəkil' },
    { id: 'image-to-image', label: 'Şəkli dəyiş' },
  ],
  video: [
    { id: 'text-to-video', label: 'Mətndən video' },
    { id: 'image-to-video', label: 'Şəkildən video' },
    { id: 'video-to-video', label: 'Videonu dəyiş' },
    { id: 'lipsync', label: 'Lip Sync' },
    { id: 'recast', label: 'Recast' },
    { id: 'motion-control', label: 'Motion' },
  ],
};

const EXCLUDED_FIELDS = new Set([
  'prompt',
  'image_url',
  'images_list',
  'image',
  'video_url',
  'last_image',
  'last_image_url',
  'aspect_ratio',
  'duration',
  'resolution',
  'quality',
  'seed',
]);

const isVideoUrl = (url = '') => /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function StudioClient({ user, category, initialMode, initialModel, initialGenerations = [] }) {
  const router = useRouter();
  const modeList = MODES[category] || MODES.image;
  const [mode, setMode] = useState(
    modeList.some((item) => item.id === initialMode) ? initialMode : modeList[0].id,
  );
  const [model, setModel] = useState(initialModel || null);
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [lastImageUrl, setLastImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [aspect, setAspect] = useState('');
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState('');
  const [quality, setQuality] = useState('');
  const [params, setParams] = useState({});
  const [credits, setCredits] = useState(user?.credits ?? 0);
  const [generating, setGenerating] = useState(false);
  const [activeGen, setActiveGen] = useState(null);
  const [history, setHistory] = useState(initialGenerations);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerModels, setPickerModels] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => () => {
    abortRef.current = true;
  }, []);

  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem('vyral_prompt');
      const kind = window.sessionStorage.getItem('vyral_kind');
      if (stored && (!kind || kind === category)) setPrompt(stored);
      window.sessionStorage.removeItem('vyral_prompt');
      window.sessionStorage.removeItem('vyral_kind');
    } catch {
      // ignore storage errors
    }
  }, [category]);

  useEffect(() => {
    if (!model) return;
    const ratios = model.aspectRatios || [];
    setAspect((current) => (ratios.includes(current) ? current : ratios.includes('16:9') ? '16:9' : ratios[0] || ''));
    const durations = (model.durations || []).map(Number).filter(Boolean);
    setDuration((current) => (durations.includes(Number(current)) ? Number(current) : durations.includes(5) ? 5 : durations[0] || 5));
    const resolutions = model.resolutions || [];
    setResolution((current) => (resolutions.includes(current) ? current : resolutions.includes('720p') ? '720p' : resolutions[0] || ''));
    const defaults = {};
    for (const [key, input] of Object.entries(model.inputs || {})) {
      if (input?.default !== undefined && !EXCLUDED_FIELDS.has(key)) defaults[key] = input.default;
    }
    setParams(defaults);
  }, [model]);

  const loadModel = useCallback(async (card) => {
    setError(null);
    try {
      const query = new URLSearchParams({
        category: card.category || category,
        mode: card.mode,
        id: card.id,
      });
      const response = await fetch(`/api/model?${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Model yüklənmədi.');
      setModel(data.model);
      setMode(data.model.mode);
    } catch (err) {
      setError(err.message);
    }
  }, [category]);

  const pickMode = async (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setActiveGen(null);
    setError(null);
    if (model?.mode === nextMode) return;
    setModel(null);
    setPickerLoading(true);
    try {
      const response = await fetch(`/api/models?category=${category}&mode=${nextMode}&limit=12`);
      const data = await response.json();
      if (data.models?.[0]) await loadModel(data.models[0]);
    } finally {
      setPickerLoading(false);
    }
  };

  useEffect(() => {
    if (!pickerOpen) return undefined;
    const timer = setTimeout(async () => {
      setPickerLoading(true);
      try {
        const query = new URLSearchParams({
          category,
          mode,
          q: pickerQuery,
          limit: '30',
        });
        const response = await fetch(`/api/models?${query}`);
        const data = await response.json();
        setPickerModels(data.models || []);
      } catch {
        setPickerModels([]);
      } finally {
        setPickerLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [pickerOpen, pickerQuery, category, mode]);

  const estimated = useMemo(
    () => estimateCredits(model, { duration, resolution, quality }),
    [model, duration, resolution, quality],
  );

  const needsImage = mode === 'image-to-image' || mode === 'image-to-video';
  const needsVideo = mode === 'video-to-video';
  const showImageUpload = needsImage || Boolean(model?.imageField);
  const hasCredits = credits >= estimated;

  const upload = async (file, target = 'image') => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yükləmə alınmadı.');
      if (target === 'video') setVideoUrl(data.url);
      else if (target === 'last') setLastImageUrl(data.url);
      else setImageUrl(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const poll = async (id) => {
    for (let attempt = 0; attempt < 360; attempt += 1) {
      await sleep(2500);
      if (abortRef.current) return;
      try {
        const response = await fetch(`/api/generations/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Nəticə oxunmadı.');
        setCredits(data.credits);
        if (data.generation.status === 'completed') {
          setActiveGen(data.generation);
          setHistory((previous) => [data.generation, ...previous.filter((item) => item.id !== id)].slice(0, 24));
          setGenerating(false);
          setNotice('Generasiya hazırdır.');
          router.refresh();
          return;
        }
        if (data.generation.status === 'failed') {
          setActiveGen(data.generation);
          setError(data.generation.error || 'Generasiya alınmadı. Kredit geri qaytarıldı.');
          setGenerating(false);
          router.refresh();
          return;
        }
      } catch (err) {
        if (!abortRef.current) {
          setError(err.message);
          setGenerating(false);
        }
        return;
      }
    }
    setGenerating(false);
    setError('Generasiya çox uzun çəkdi. Bir az sonra tarixçədən yoxlayın.');
  };

  const generate = async () => {
    setError(null);
    setNotice(null);
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/studio/${category}`)}`);
      return;
    }
    if (!model) {
      setError('Model seçin.');
      return;
    }
    if (model.promptRequired && model.hasPrompt !== false && !prompt.trim()) {
      setError('Prompt yazın.');
      return;
    }
    if (needsImage && !imageUrl) {
      setError('Bu rejim üçün istinad şəkil yükləyin.');
      return;
    }
    if (needsVideo && !videoUrl) {
      setError('Bu rejim üçün video yükləyin.');
      return;
    }
    if (!hasCredits) {
      setError(`Kifayət qədər kredit yoxdur. Lazımdır: ${estimated}.`);
      return;
    }

    setGenerating(true);
    setActiveGen(null);
    abortRef.current = false;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          mode,
          modelId: model.id,
          prompt,
          image_url: imageUrl || null,
          images_list: imageUrl ? [imageUrl] : [],
          last_image: lastImageUrl || null,
          video_url: videoUrl || null,
          aspect_ratio: aspect || null,
          duration: model.durations?.length ? duration : null,
          resolution: resolution || null,
          quality: quality || null,
          params,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.details?.credits !== undefined) setCredits(data.details.credits);
        throw new Error(data.error || 'Generasiya başladılmadı.');
      }
      setCredits(data.credits);
      const generation = {
        ...data.generation,
        category,
        modelId: model.id,
        prompt,
        createdAt: new Date().toISOString(),
      };
      setActiveGen(generation);
      if (generation.status === 'completed') {
        setGenerating(false);
        setHistory((previous) => [generation, ...previous].slice(0, 24));
        setNotice('Generasiya hazırdır.');
        router.refresh();
      } else {
        void poll(generation.id);
      }
    } catch (err) {
      setError(err.message);
      setGenerating(false);
    }
  };

  const useAsInput = () => {
    if (!activeGen?.outputUrl) return;
    if (isVideoUrl(activeGen.outputUrl) || category === 'video') return;
    setImageUrl(activeGen.outputUrl);
    const nextMode = category === 'image' ? 'image-to-image' : 'image-to-video';
    if (MODES[category]?.some((item) => item.id === nextMode)) void pickMode(nextMode);
    setNotice('Nəticə istinad şəkli kimi əlavə edildi.');
  };

  const dynamicFields = Object.entries(model?.inputs || {})
    .filter(([key, input]) => !EXCLUDED_FIELDS.has(key) && input && (
      input.enum?.length || input.type === 'boolean' || input.type === 'int' || input.type === 'number'
    ))
    .slice(0, 6);

  const previewUrl = activeGen?.outputUrl;
  const previewIsVideo = activeGen?.category === 'video' || isVideoUrl(previewUrl || '');

  return (
    <div className="studio-page">
      <div className="studio-bar">
        <div className="row" style={{ gap: 14 }}>
          <div className="studio-tabs">
            <Link href="/studio/image" className={category === 'image' ? 'active' : ''}>
              <ImageIcon size={13} /> Şəkil
            </Link>
            <Link href="/studio/video" className={category === 'video' ? 'active' : ''}>
              <Video size={13} /> Video
            </Link>
          </div>
          <span className="tiny muted" style={{ display: 'none' }}>
            {model?.providerName}
          </span>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <span className="credit-chip">
            <span className="dot" /> {formatCredits(credits)} kredit
          </span>
          <Link href="/pricing" className="btn btn-sm">
            Kredit al
          </Link>
        </div>
      </div>

      <div className="studio-layout">
        <aside className="studio-controls">
          <div className="studio-controls-scroll">
            <div className="studio-panel-title">
              <span>Rejim</span>
              <span>{model?.modeLabel || '—'}</span>
            </div>
            <div className="mode-switch" style={{ gridTemplateColumns: `repeat(${Math.min(modeList.length, 2)}, 1fr)` }}>
              {modeList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={mode === item.id ? 'active' : ''}
                  onClick={() => pickMode(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="studio-panel-title mt-3">
              <span>Model</span>
              <span>{model?.providerName || ''}</span>
            </div>
            <div className="model-picker">
              <button
                type="button"
                className="model-picker-btn"
                onClick={() => setPickerOpen((value) => !value)}
              >
                <span>
                  <b>{model?.name || (pickerLoading ? 'Yüklənir…' : 'Model seçin')}</b>
                  <span>{model?.modeLabel || '587 model kataloqu'}</span>
                </span>
                <ChevronDown size={15} color="var(--muted)" />
              </button>
              {pickerOpen ? (
                <div className="model-picker-menu">
                  <div className="search-box" style={{ padding: 6 }}>
                    <Search size={13} />
                    <input
                      autoFocus
                      value={pickerQuery}
                      onChange={(event) => setPickerQuery(event.target.value)}
                      placeholder="Model axtar…"
                      style={{ paddingLeft: 30 }}
                    />
                  </div>
                  <div className="model-picker-list">
                    {pickerLoading ? (
                      <div style={{ padding: 14, color: 'var(--muted)', fontSize: 11 }}>Yüklənir…</div>
                    ) : pickerModels.length ? (
                      pickerModels.map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          className={`model-picker-item ${item.id === model?.id ? 'active' : ''}`}
                          onClick={() => {
                            setPickerOpen(false);
                            setPickerQuery('');
                            void loadModel(item);
                          }}
                        >
                          <span style={{ color: 'var(--text)', fontSize: 11 }}>{item.name}</span>
                          <span>{item.providerName}</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: 14, color: 'var(--muted)', fontSize: 11 }}>Model tapılmadı.</div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="studio-panel-title mt-3">
              <span>Prompt</span>
              <span>{prompt.length}/6000</span>
            </div>
            <div className="studio-textarea">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value.slice(0, 6000))}
                placeholder={
                  category === 'image'
                    ? 'Nə yaratmaq istədiyinizi təsvir edin…'
                    : 'Kadrı, hərəkəti, işığı və kamera bucağını təsvir edin…'
                }
              />
            </div>

            {showImageUpload ? (
              <div className="option-block">
                <div className="option-label">
                  <b>{needsImage ? 'İstinad şəkil *' : 'İstinad şəkil (opsional)'}</b>
                  {imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      style={{ border: 0, background: 'none', color: 'var(--muted)' }}
                    >
                      <X size={12} />
                    </button>
                  ) : null}
                </div>
                <label className="upload-zone">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => upload(event.target.files?.[0], 'image')}
                  />
                  {imageUrl ? (
                    <img src={imageUrl} alt="İstinad" className="thumb" />
                  ) : (
                    <span className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                      {uploading ? <Loader2 size={15} className="spinner" /> : <Upload size={15} />}
                    </span>
                  )}
                  <span>
                    <b>{uploading ? 'Yüklənir…' : imageUrl ? 'Şəkil əlavə edildi' : 'Şəkil yüklə'}</b>
                    <span>PNG, JPG, WEBP · max 30 MB</span>
                  </span>
                </label>
              </div>
            ) : null}

            {model?.lastImageField ? (
              <div className="option-block">
                <div className="option-label"><b>Son kadr (opsional)</b></div>
                <label className="upload-zone">
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => upload(event.target.files?.[0], 'last')}
                  />
                  {lastImageUrl ? (
                    <img src={lastImageUrl} alt="Son kadr" className="thumb" />
                  ) : (
                    <span className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                      <Upload size={15} />
                    </span>
                  )}
                  <span>
                    <b>{lastImageUrl ? 'Son kadr hazırdır' : 'Son kadr yüklə'}</b>
                    <span>Keçidi idarə etmək üçün</span>
                  </span>
                </label>
              </div>
            ) : null}

            {needsVideo ? (
              <div className="option-block">
                <div className="option-label"><b>Mənbə video *</b></div>
                <label className="upload-zone">
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={(event) => upload(event.target.files?.[0], 'video')}
                  />
                  {videoUrl ? (
                    <video src={videoUrl} className="thumb" muted />
                  ) : (
                    <span className="thumb" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                      <Video size={15} />
                    </span>
                  )}
                  <span>
                    <b>{videoUrl ? 'Video əlavə edildi' : 'Video yüklə'}</b>
                    <span>MP4, WEBM · max 30 MB</span>
                  </span>
                </label>
              </div>
            ) : null}

            {model?.aspectRatios?.length ? (
              <div className="option-block">
                <div className="option-label"><b>Aspekt nisbəti</b><span>{aspect}</span></div>
                <div className="segmented">
                  {model.aspectRatios.slice(0, 8).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      className={aspect === ratio ? 'active' : ''}
                      onClick={() => setAspect(ratio)}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {model?.durations?.length ? (
              <div className="option-block">
                <div className="option-label"><b>Müddət</b><span>{duration}s</span></div>
                <div className="segmented">
                  {model.durations.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={Number(duration) === Number(value) ? 'active' : ''}
                      onClick={() => setDuration(Number(value))}
                    >
                      {value}s
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {model?.resolutions?.length ? (
              <div className="option-block">
                <div className="option-label"><b>Keyfiyyət</b><span>{resolution}</span></div>
                <div className="segmented">
                  {model.resolutions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={resolution === value ? 'active' : ''}
                      onClick={() => setResolution(value)}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {dynamicFields.map(([key, input]) => {
              const value = params[key] ?? input.default ?? '';
              return (
                <div className="option-block" key={key}>
                  <div className="option-label">
                    <b>{input.title || key}</b>
                    <span>{String(value)}</span>
                  </div>
                  {input.enum?.length ? (
                    <div className="segmented">
                      {input.enum.slice(0, 8).map((option) => (
                        <button
                          key={String(option)}
                          type="button"
                          className={String(value) === String(option) ? 'active' : ''}
                          onClick={() => setParams((previous) => ({ ...previous, [key]: option }))}
                        >
                          {String(option)}
                        </button>
                      ))}
                    </div>
                  ) : input.type === 'boolean' ? (
                    <div className="segmented">
                      <button
                        type="button"
                        className={value === true ? 'active' : ''}
                        onClick={() => setParams((previous) => ({ ...previous, [key]: true }))}
                      >
                        Aktiv
                      </button>
                      <button
                        type="button"
                        className={value === false ? 'active' : ''}
                        onClick={() => setParams((previous) => ({ ...previous, [key]: false }))}
                      >
                        Deaktiv
                      </button>
                    </div>
                  ) : (
                    <input
                      type="number"
                      className="mini-input"
                      style={{ width: '100%', height: 34 }}
                      value={value}
                      min={input.minValue}
                      max={input.maxValue}
                      step={input.step}
                      onChange={(event) => setParams((previous) => ({ ...previous, [key]: event.target.value }))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="studio-generate">
            <div className="cost-row">
              <span>Təxmini kredit</span>
              <b>{formatCredits(estimated)}</b>
            </div>
            <div className="cost-row">
              <span>Balans</span>
              <span>{formatCredits(credits)}</span>
            </div>
            {error ? (
              <div className="error-banner">
                <X size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            ) : null}
            {notice ? <div className="form-success mt-1">{notice}</div> : null}
            {user ? (
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg mt-2"
                onClick={generate}
                disabled={generating || uploading || !model || !hasCredits}
                style={{ marginTop: 10 }}
              >
                {generating ? <Loader2 size={15} className="spinner" /> : <Sparkles size={15} />}
                {generating ? 'Yaradılır…' : !hasCredits ? 'Kredit yoxdur' : 'Yarat'}
              </button>
            ) : (
              <Link
                href={`/login?next=${encodeURIComponent(`/studio/${category}`)}`}
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: 10 }}
              >
                Daxil ol və yarat
              </Link>
            )}
            <p className="tiny muted text-center mt-1" style={{ marginTop: 8 }}>
              Kredit yalnız uğurlu nəticə üçün tutulur; xəta halında geri qaytarılır.
            </p>
          </div>
        </aside>

        <section className="studio-stage">
          <div className="studio-canvas">
            {generating && !previewUrl ? (
              <div className="canvas-loading">
                <div className="loader-ring" />
                <b>{model?.name} işləyir…</b>
                <span>{prompt || 'Kadr hazırlanır'} · {formatCredits(estimated)} kredit</span>
              </div>
            ) : previewUrl ? (
              <div className="canvas-media">
                {previewIsVideo ? (
                  <video src={previewUrl} controls autoPlay loop playsInline />
                ) : (
                  <img src={previewUrl} alt={activeGen?.prompt || 'Generasiya'} />
                )}
              </div>
            ) : (
              <div className="canvas-empty">
                <div className="orb" />
                <h3>Xəyalını kadra çevir.</h3>
                <p>
                  Soldan model seç, prompt yaz və «Yarat» düyməsinə bas.
                  Nəticə burada görünəcək.
                </p>
                <div className="row wrap" style={{ justifyContent: 'center', gap: 6, marginTop: 16 }}>
                  <span className="micro-tag">{model?.providerName || 'MuAPI'}</span>
                  <span className="micro-tag">{model?.modeLabel || 'Studio'}</span>
                  <span className="micro-tag">{formatCredits(estimated)} kredit</span>
                </div>
              </div>
            )}
          </div>

          <div className="canvas-toolbar">
            <div className="row" style={{ gap: 8 }}>
              <span className="micro-tag">{activeGen?.modelName || model?.name || 'Studio'}</span>
              {activeGen?.status ? (
                <span className={`status ${activeGen.status}`}>{activeGen.status === 'completed' ? 'Hazır' : 'İşlənir'}</span>
              ) : null}
            </div>
            <div className="row" style={{ gap: 6 }}>
              {previewUrl && !previewIsVideo ? (
                <button type="button" className="btn btn-sm" onClick={useAsInput}>
                  <Wand2 size={12} /> İstinad kimi
                </button>
              ) : null}
              {previewUrl ? (
                <>
                  <a className="btn btn-sm" href={previewUrl} target="_blank" rel="noreferrer">
                    <ArrowUpRight size={12} /> Aç
                  </a>
                  <a className="btn btn-sm btn-primary" href={previewUrl} download target="_blank" rel="noreferrer">
                    <Download size={12} /> Yüklə
                  </a>
                </>
              ) : (
                <span className="tiny muted">Nəticə yoxdur</span>
              )}
            </div>
          </div>

          <div className="studio-history">
            {history.length ? (
              history.map((item) => {
                const url = item.outputUrl;
                if (!url) return null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`history-thumb ${activeGen?.id === item.id ? 'active' : ''}`}
                    onClick={() => setActiveGen(item)}
                    title={item.prompt || item.modelName}
                  >
                    {item.category === 'video' || isVideoUrl(url) ? (
                      <video src={url} muted />
                    ) : (
                      <img src={url} alt={item.modelName} loading="lazy" />
                    )}
                  </button>
                );
              })
            ) : (
              <span className="tiny muted">Tarixçə boşdur — ilk generasiyan burada görünəcək.</span>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
