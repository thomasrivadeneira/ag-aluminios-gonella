'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateLong } from '@/lib/format'

interface HeaderProps {
  userName?: string
  userRol?: string
}

export default function Header({ userName, userRol }: HeaderProps) {
  const [today, setToday] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setToday(formatDateLong(new Date()))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header
      style={{
        height: 64,
        background: 'white',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '1.5rem',
        paddingRight: '1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Fecha */}
      <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
        <span style={{ textTransform: 'capitalize' }}>{today}</span>
      </div>

      {/* User menu */}
      <div style={{ position: 'relative' }}>
        <button
          id="user-menu-button"
          onClick={() => setShowMenu(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.75rem',
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: 'white',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={14} color="white" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.2 }}>
              {userName || 'Usuario'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
              {userRol || 'operador'}
            </div>
          </div>
          <ChevronDown size={14} color="var(--color-text-muted)" />
        </button>

        {showMenu && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setShowMenu(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'white',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: 180,
                zIndex: 11,
                overflow: 'hidden',
              }}
            >
              <button
                id="logout-button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.75rem 1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--color-danger)',
                  fontWeight: 500,
                  transition: 'background 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseOut={e => (e.currentTarget.style.background = 'none')}
              >
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
