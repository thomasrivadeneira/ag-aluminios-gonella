import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Obtener datos del usuario de la tabla usuarios_app
  const { data: usuarioApp } = await supabase
    .from('usuarios_app')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-surface)' }}>
      <Sidebar />
      <div
        style={{
          marginLeft: 'var(--sidebar-width)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Header
          userName={usuarioApp?.nombre || user.email?.split('@')[0]}
          userRol={usuarioApp?.rol}
        />
        <main
          style={{
            flex: 1,
            padding: '1.75rem 2rem',
            maxWidth: '100%',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
