'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

export function Faq({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq-list">
      {items.map((item, index) => (
        <div key={item.q} className={`faq-item ${open === index ? 'open' : ''}`}>
          <button
            type="button"
            className="faq-q"
            onClick={() => setOpen(open === index ? -1 : index)}
            aria-expanded={open === index}
          >
            {item.q}
            <Plus size={17} />
          </button>
          <div className="faq-a">{item.a}</div>
        </div>
      ))}
    </div>
  );
}
