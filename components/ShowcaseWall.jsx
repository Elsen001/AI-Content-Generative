'use client';

import { useRef, useState } from 'react';
import { Heart, Play, Pause, Sparkles } from 'lucide-react';

function formatLikes(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
}

function ShowcaseCard({ item }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <article className="show-card">
      {item.video_url ? (
        <video
          ref={videoRef}
          src={item.video_url}
          muted
          loop
          playsInline
          preload="auto"
          onMouseEnter={() => {
            videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
          }}
          onMouseLeave={() => {
            videoRef.current?.pause();
            setPlaying(false);
          }}
        />
      ) : (
        <img src={item.poster_url} alt={item.title} loading="lazy" />
      )}
      <div className="top">
        <span className="show-tag">
          <Sparkles size={9} /> {item.model || 'VYRAL'}
        </span>
        <span className="show-likes">
          <Heart size={10} /> {formatLikes(item.likes)}
        </span>
      </div>
      <div className="bottom">
        <div className="between" style={{ alignItems: 'flex-end' }}>
          <div>
            <h3>{item.title}</h3>
            <p>{item.category === 'video' ? 'AI video' : 'AI şəkil'} · MuAPI</p>
          </div>
          {item.video_url ? (
            <button type="button" className="play" onClick={play} aria-label={playing ? 'Dayandır' : 'Oynat'}>
              {playing ? <Pause size={12} /> : <Play size={12} />}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ShowcaseWall({ items = [] }) {
  const [filter, setFilter] = useState('all');
  const visible = items.filter((item) => filter === 'all' || item.category === filter);

  return (
    <>
      <div className="showcase-head">
        <div className="left">
          <span className="eyebrow">
            <span className="dot" /> Viral showcase
          </span>
          <h2>Bu həftə partlayan kadrlar.</h2>
        </div>
        <div className="showcase-tabs">
          <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
            Hamısı
          </button>
          <button type="button" className={filter === 'video' ? 'active' : ''} onClick={() => setFilter('video')}>
            Video
          </button>
          <button type="button" className={filter === 'image' ? 'active' : ''} onClick={() => setFilter('image')}>
            Şəkil
          </button>
        </div>
      </div>
      <div className="showcase-grid">
        {visible.map((item) => (
          <ShowcaseCard key={item.id} item={item} />
        ))}
      </div>
    </>
  );
}
