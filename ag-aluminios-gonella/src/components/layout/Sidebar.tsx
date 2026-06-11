'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Wallet,
  ClipboardList,
  Users,
  Briefcase,
  Receipt,
  CreditCard,
  TrendingDown,
  BarChart3,
  Settings,
  ChevronRight,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/caja', label: 'Caja del día', icon: Wallet },
  { href: '/arqueo', label: 'Arqueo', icon: ClipboardList },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/trabajos', label: 'Trabajos', icon: Briefcase },
  { href: '/cuenta-corriente', label: 'Cuenta corriente', icon: Receipt },
  { href: '/cheques', label: 'Cheques', icon: CreditCard },
  { href: '/categorias', label: 'Egresos / Categ.', icon: TrendingDown },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/configuracion', label: 'Configuración', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--color-primary)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 30,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '1.5rem 1.25rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>AG</span>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>
              AG Aluminios
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem', marginTop: 2 }}>
              Gonella
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.625rem',
                    padding: '0.6rem 0.875rem',
                    borderRadius: 9,
                    textDecoration: 'none',
                    transition: 'all 0.15s',
                    background: isActive
                      ? 'rgba(16, 185, 129, 0.18)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--color-accent-light)'
                      : 'rgba(255,255,255,0.65)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: '0.875rem',
                    position: 'relative',
                  }}
                >
                  {isActive && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 3,
                        height: 20,
                        borderRadius: '0 3px 3px 0',
                        background: 'var(--color-accent)',
                      }}
                    />
                  )}
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {isActive && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom version */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: '0.6875rem',
          color: 'rgba(255,255,255,0.3)',
        }}
      >
        v1.0.0 — AG Aluminios Gonella
      </div>
    </aside>
  )
}
