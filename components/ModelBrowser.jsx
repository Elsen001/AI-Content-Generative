'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Search, Sparkles, X } from 'lucide-react';

const MODEL_ICONS = {
  image: '◐',
  video: '▷',
  audio: '♫',
};

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

function ModelCard({ model }) {
  const studioHref = `/studio/${model.category}?model=${encodeURIComponent(model.id)}&mode=${encodeURIComponent(model.mode)}`;
  const available = model.category === 'image' || model.category === 'video';
  return (
    <article className="model-card">
      <div className="model-card-top">
        <span className="model-avatar" aria-hidden="true">{initials(model.name)}</span>
        <span className="model-mode">{model.modeLabel}</span>
      </div>
      <h3>{model.name}</h3>
      <p className="provider">{model.providerName}</p>
      <p className="desc">{model.description}</p>
      <div className="foot">
        <span className="tiny muted">
          {model.aspectRatios?.length ? `${model.aspectRatios.length} ratio` : 'Prompt'}
        </span>
        {available ? (
          <Link href={studioHref} className="model-try">
            Sına <ArrowUpRight size={10} />
          </Link>
        ) : (
          <span className="model-try" style={{ color: 'var(--muted-2)' }}>Tezliklə</span>
        )}
      </div>
    </article>
  );
}

export function ModelBrowser({ initialData }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('all');
  const [mode, setMode] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 280);
    return () => clearTimeout(timer);
  }, [query]);

  const modes = useMemo(() => {
    if (category === 'all') return [];
    return initialData.facets.modes[category] || [];
  }, [category, initialData.facets.modes]);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    setLoading(true);

    const params = new URLSearchParams({
      q: debounced,
      category,
      mode,
      provider,
      page: String(page),
      limit: '48',
    });

    fetch(`/api/models?${params}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload) => {
        setData(payload);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoading(false);
      });

    return () => controller.abort();
  }, [debounced, category, mode, provider, page]);

  const changeCategory = (next) => {
    setCategory(next);
    setMode('');
    setPage(1);
  };

  return (
    <div>
      <div className="models-toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Model, provider və ya istifadə halı axtar…"
            aria-label="Model axtar"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{ position: 'absolute', right: 8, top: 11, border: 0, background: 'none', color: 'var(--muted)' }}
              aria-label="Təmizlə"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="category-tabs">
          {[
            { id: 'all', label: 'Hamısı' },
            { id: 'image', label: 'Şəkil' },
            { id: 'video', label: 'Video' },
            { id: 'audio', label: 'Audio' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              className={category === item.id ? 'active' : ''}
              onClick={() => changeCategory(item.id)}
            >
              {item.label}
              <span className="tiny muted" style={{ marginLeft: 5 }}>
                {initialData.facets.categories[item.id] || 0}
              </span>
            </button>
          ))}
        </div>

        {modes.length ? (
          <select
            className="filter-select"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
              setPage(1);
            }}
            aria-label="Rejim"
          >
            <option value="">Bütün rejimlər</option>
            {modes.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        ) : null}

        <select
          className="filter-select"
          value={provider}
          onChange={(event) => {
            setProvider(event.target.value);
            setPage(1);
          }}
          aria-label="Provider"
        >
          <option value="">Bütün providerlər</option>
          {initialData.facets.providers.map((item) => (
            <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
          ))}
        </select>
      </div>

      <div className="models-count">
        <span>
          <b style={{ color: 'var(--text)' }}>{data.total}</b> model tapıldı
          {loading ? ' · yenilənir…' : ''}
        </span>
        <span className="row" style={{ gap: 6 }}>
          <Sparkles size={12} color="var(--lime)" />
          {data.page} / {data.pages} səhifə
        </span>
      </div>

      {data.models.length ? (
        <div className="model-grid" style={{ opacity: loading ? 0.55 : 1, transition: 'opacity .2s' }}>
          {data.models.map((model) => (
            <ModelCard key={model.key} model={model} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Bu filtrə uyğun model yoxdur.</p>
          <button
            type="button"
            className="btn btn-sm mt-2"
            onClick={() => {
              setQuery('');
              setCategory('all');
              setMode('');
              setProvider('');
              setPage(1);
            }}
          >
            Filtrləri sıfırla
          </button>
        </div>
      )}

      {data.pages > 1 ? (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            ←
          </button>
          {Array.from({ length: Math.min(5, data.pages) }, (_, index) => {
            const start = Math.max(1, Math.min(page - 2, data.pages - 4));
            return start + index;
          })
            .filter((value) => value <= data.pages)
            .map((value) => (
              <button
                key={value}
                type="button"
                className={value === page ? 'active' : ''}
                onClick={() => setPage(value)}
              >
                {value}
              </button>
            ))}
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((value) => Math.min(data.pages, value + 1))}>
            <ArrowRight size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
