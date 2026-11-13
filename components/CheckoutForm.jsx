'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CheckoutForm({ orderId }) {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, note }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Göndərilmədi.');
      setMessage('Ödəniş məlumatı göndərildi. Admin təsdiqindən sonra kreditlər yüklənəcək.');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      {message ? <div className="form-success">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <div className="field">
        <label htmlFor="reference">Ödəniş referansı / tranzaksiya ID</label>
        <input
          id="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Məsələn: bank köçürmə nömrəsi"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="note">Qeyd (istəyə bağlı)</label>
        <textarea
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ödəniş tarixi, göndərən adı və s."
        />
      </div>
      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
        {loading ? 'Göndərilir…' : 'Ödənişi bildir'}
      </button>
    </form>
  );
}
