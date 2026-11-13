'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AccountForm({ user }) {
  const router = useRouter();
  const [name, setName] = useState(user.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Yenilənmədi.');
      setMessage('Hesab məlumatları yeniləndi.');
      setCurrentPassword('');
      setNewPassword('');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={submit} style={{ marginTop: 0 }}>
      {message ? <div className="form-success">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <div className="field">
        <label htmlFor="acc-name">Ad</label>
        <input id="acc-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="acc-current">Mövcud şifrə</label>
        <input
          id="acc-current"
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Şifrəni dəyişmək üçün"
          autoComplete="current-password"
        />
      </div>
      <div className="field">
        <label htmlFor="acc-new">Yeni şifrə</label>
        <input
          id="acc-new"
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="Ən azı 8 simvol"
          autoComplete="new-password"
          minLength={8}
        />
      </div>
      <button type="submit" className="btn btn-sm" disabled={loading}>
        {loading ? 'Saxlanır…' : 'Yadda saxla'}
      </button>
    </form>
  );
}
