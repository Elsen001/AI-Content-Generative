'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, Shield, Sparkles, X } from 'lucide-react';
import { Logo } from './Logo';
import { formatCredits } from '@/lib/credit-rules';

export function SiteHeader({ user = null, announcement = '' }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenu(false);
  }, [pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  const navItems = [
    { href: '/models', label: 'Modellər' },
    { href: '/studio/image', label: 'Şəkil' },
    { href: '/studio/video', label: 'Video' },
    { href: '/pricing', label: 'Planlar' },
  ];

  return (
    <>
      {announcement ? (
        <div className="announce">
          <Sparkles size={12} />
          <span>{announcement}</span>
        </div>
      ) : null}
      <header className={`site-header ${scrolled ? 'scrolled' : ''}`}>
        <div className="container-wide nav">
          <div className="row" style={{ gap: 26 }}>
            <Logo />
            <nav className="nav-links" aria-label="Əsas naviqasiya">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              ))}
              {user?.role === 'admin' ? (
                <Link href="/admin" className={`nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                  Admin
                </Link>
              ) : null}
            </nav>
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                <Link href="/dashboard" className="credit-chip" title="Kredit balansı">
                  <span className="dot" />
                  {formatCredits(user.credits)} kredit
                </Link>
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="avatar-btn"
                    onClick={() => setUserMenu((value) => !value)}
                    aria-expanded={userMenu}
                  >
                    <span className="avatar">{(user.name || 'V').charAt(0).toUpperCase()}</span>
                    <span className="hidden-sm">{user.name?.split(' ')[0]}</span>
                  </button>
                  {userMenu ? (
                    <div
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 46,
                        width: 200,
                        padding: 6,
                        border: '1px solid var(--line-strong)',
                        borderRadius: 12,
                        background: '#0d0d11',
                        boxShadow: '0 20px 60px rgba(0,0,0,.6)',
                        zIndex: 80,
                      }}
                    >
                      <Link href="/dashboard" className="nav-link" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <LayoutDashboard size={14} /> Kabinet
                      </Link>
                      {user.role === 'admin' ? (
                        <Link href="/admin" className="nav-link" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Shield size={14} /> Admin panel
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="nav-link"
                        style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', background: 'none', border: 0 }}
                        onClick={logout}
                      >
                        <LogOut size={14} /> Çıxış
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm">
                  Daxil ol
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Pulsuz başla
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn mobile-toggle"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label="Menyu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className={`mobile-menu ${mobileOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
          {user?.role === 'admin' ? <Link href="/admin">Admin</Link> : null}
          <div className="mobile-actions">
            {user ? (
              <>
                <Link href="/dashboard" className="btn btn-block">
                  Kabinet · {formatCredits(user.credits)} kredit
                </Link>
                <button type="button" className="btn btn-block btn-ghost" onClick={logout}>
                  Çıxış
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-block">
                  Daxil ol
                </Link>
                <Link href="/register" className="btn btn-block btn-primary">
                  Pulsuz başla
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
