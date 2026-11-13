'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export function AuthForm({ mode = 'login', next = '/dashboard', referral = '' }) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ref, setRef] = useState(referral);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(isRegister ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isRegister ? { name, email, password, ref } : { email, password },
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Xəta baş verdi.');
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      {error ? <div className="form-error">{error}</div> : null}
      {isRegister ? (
        <div className="field">
          <label htmlFor="name">Ad</label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Adınız"
            autoComplete="name"
            required
            minLength={2}
          />
        </div>
      ) : null}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="siz@studio.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="password">Şifrə</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isRegister ? 'Ən azı 8 simvol' : '••••••••'}
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          required
          minLength={isRegister ? 8 : 1}
        />
      </div>
      {isRegister ? (
        <div className="field">
          <label htmlFor="ref">Referral kodu (istəyə bağlı)</label>
          <input
            id="ref"
            value={ref}
            onChange={(event) => setRef(event.target.value)}
            placeholder="Dəvət edənin kodu"
          />
          <span className="hint">Kodla qeydiyyatdan keçsəniz, hər ikiniz bonus kredit qazanırsınız.</span>
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
        {loading ? 'Gözləyin…' : isRegister ? 'Hesab yarat' : 'Daxil ol'}
        {!loading ? <ArrowRight size={15} /> : null}
      </button>

      <div className="divider">və ya</div>
      <Link href={isRegister ? '/login' : '/register'} className="btn btn-block btn-ghost">
        {isRegister ? 'Hesabım var — daxil ol' : 'Yeni hesab yarat'}
      </Link>
    </form>
  );
}
