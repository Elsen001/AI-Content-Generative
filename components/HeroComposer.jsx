'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Image as ImageIcon, Sparkles, Video, Wand2 } from 'lucide-react';

const PROMPTS = [
  'Neon yağışında rəqs edən kiberpunk personaj, cinematic 4K, slow motion…',
  'Şüşə taxılan lüks ətir şüşəsi, studiya işığı, ultra detal, reklam kadrı…',
  'Günəş batımında səhra karvanı, drone geniş plan, film grain, 35mm…',
  'Minimalist mətbəxdə buxarlanan qəhvə, makro lens, yumşaq işıq…',
];

export function HeroComposer() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [kind, setKind] = useState('video');
  const [placeholder, setPlaceholder] = useState(PROMPTS[0]);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      index = (index + 1) % PROMPTS.length;
      setPlaceholder(PROMPTS[index]);
    }, 4200);
    return () => clearInterval(timer);
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const value = prompt.trim();
    try {
      if (value) window.sessionStorage.setItem('vyral_prompt', value);
      window.sessionStorage.setItem('vyral_kind', kind);
    } catch {
      // sessionStorage may be unavailable; the studio still works.
    }
    router.push(kind === 'image' ? '/studio/image' : '/studio/video');
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-input">
        <Wand2 size={17} />
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={placeholder}
          aria-label="Prompt"
          maxLength={1200}
        />
      </div>
      <div className="composer-bar">
        <div className="composer-chips">
          <button
            type="button"
            className={`chip ${kind === 'video' ? 'active' : ''}`}
            onClick={() => setKind('video')}
          >
            <Video size={11} /> Video
          </button>
          <button
            type="button"
            className={`chip ${kind === 'image' ? 'active' : ''}`}
            onClick={() => setKind('image')}
          >
            <ImageIcon size={11} /> Şəkil
          </button>
          <span className="chip">
            <Sparkles size={11} /> 4K
          </span>
        </div>
        <button type="submit" className="btn btn-primary btn-sm">
          Yarat <ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
