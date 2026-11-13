'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { formatCredits } from '@/lib/credit-rules';

const money = (cents) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;

export function PricingCards({ plans, user = null, compact = false }) {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const buy = async (plan) => {
    setError(null);
    setMessage(null);
    if (!user) {
      router.push(`/register?next=${encodeURIComponent('/pricing')}`);
      return;
    }
    setLoading(plan.id);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sifariş yaradılmadı.');

      if (data.checkoutUrl) {
        if (/^https?:/.test(data.checkoutUrl)) window.location.href = data.checkoutUrl;
        else router.push(data.checkoutUrl);
        return;
      }
      if (data.demo) {
        setMessage(`${plan.name} aktivdir — ${formatCredits(data.credits)} kredit balansınızda.`);
        router.refresh();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const list = compact ? plans.slice(0, 3) : plans;

  return (
    <div>
      {message ? <div className="form-success mb-2">{message}</div> : null}
      {error ? <div className="form-error mb-2">{error}</div> : null}
      <div className="price-grid">
        {list.map((plan) => {
          const images = Math.floor(plan.credits / 5);
          const videos = Math.floor(plan.credits / 50);
          return (
            <article key={plan.id} className={`price-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular ? <span className="popular-badge">Ən populyar</span> : null}
              <h3>{plan.name}</h3>
              <p className="tagline">{plan.tagline}</p>
              <div className="price">
                <span className="amount">{money(plan.priceCents)}</span>
                <span className="period">/ birdəfəlik</span>
              </div>
              <div className="credit-line">
                <span className="dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)' }} />
                {formatCredits(plan.credits)} kredit
              </div>
              <div className="small muted mt-1" style={{ fontSize: 10.5 }}>
                ≈ {formatCredits(images)} şəkil · ≈ {formatCredits(videos)} video
              </div>
              <ul className="price-features">
                {(plan.features || []).map((feature) => (
                  <li key={feature}>
                    <Check size={12} /> {feature}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className={`btn btn-block ${plan.popular ? 'btn-primary' : ''}`}
                onClick={() => buy(plan)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? <Loader2 size={14} className="spinner" style={{ border: 0 }} /> : null}
                {loading === plan.id ? 'Yaradılır…' : user ? 'Planı al' : 'Qeydiyyatdan keç'}
                {loading !== plan.id ? <ArrowRight size={14} /> : null}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
