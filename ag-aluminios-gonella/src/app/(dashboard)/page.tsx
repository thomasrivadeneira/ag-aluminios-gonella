import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  Wallet,
  CreditCard,
  AlertTriangle,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Receipt,
} from 'lucide-react'
import { formatMonto, formatDate } from '@/lib/format'
import { addDays } from 'date-fns'

export const metadata = {
  title: 'Dashboard — AG Aluminios Gonella',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0]

  // Saldo de caja hoy
  const { data: movimientosHoy } = await supabase
    .from('movimientos_caja')
    .select('tipo, monto')
    .eq('fecha', today)

  const ingresosHoy = movimientosHoy?.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0) ?? 0
  const egresosHoy = movimientosHoy?.filter(m => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0) ?? 0
  const saldoHoy = ingresosHoy - egresosHoy

  // Cheques a cobrar esta semana
  const { data: chequesProximos } = await supabase
    .from('cheques')
    .select('id, numero, monto, fecha_cobro, banco')
    .eq('estado', 'en_cartera')
    .lte('fecha_cobro', nextWeek)
    .gte('fecha_cobro', today)
    .order('fecha_cobro')

  const totalChequesProximos = chequesProximos?.reduce((s, c) => s + c.monto, 0) ?? 0

  // Trabajos vencidos sin cobrar
  const { data: trabajosVencidos } = await supabase
    .from('trabajos')
    .select('id, descripcion, monto_total, fecha_estimada_entrega, clientes(nombre)')
    .lt('fecha_estimada_entrega', today)
    .not('estado', 'eq', 'cobrado')
    .not('estado', 'eq', 'presupuestado')
    .order('fecha_estimada_entrega')
    .limit(5)

  // Trabajos terminados pendientes de cobro
  const { data: trabajosTerminados } = await supabase
    .from('trabajos')
    .select('id, descripcion, monto_total, clientes(nombre)')
    .eq('estado', 'terminado')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/caja" id="quick-ingreso-link" className="btn btn-accent btn-sm">
            <Plus size={15} />
            Registrar movimiento
          </Link>
          <Link href="/trabajos/nuevo" id="quick-trabajo-link" className="btn btn-ghost btn-sm">
            <Briefcase size={15} />
            Nuevo trabajo
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        {/* Saldo hoy */}
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: saldoHoy >= 0 ? '#d1fae5' : '#fee2e2' }}>
            <Wallet size={20} color={saldoHoy >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)'} />
          </div>
          <div className="stat-card-label">Saldo caja hoy</div>
          <div className="stat-card-value" style={{ color: saldoHoy >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
            {formatMonto(saldoHoy)}
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: 4 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-accent-dark)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={13} /> {formatMonto(ingresosHoy)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 2 }}>
              <ArrowDownRight size={13} /> {formatMonto(egresosHoy)}
            </span>
          </div>
        </div>

        {/* Cheques próximos */}
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fef3c7' }}>
            <CreditCard size={20} color="var(--color-warning)" />
          </div>
          <div className="stat-card-label">Cheques próx. 7 días</div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
            {formatMonto(totalChequesProximos)}
          </div>
          <div className="stat-card-sub">{chequesProximos?.length ?? 0} cheques en cartera</div>
        </div>

        {/* Trabajos vencidos */}
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fee2e2' }}>
            <AlertTriangle size={20} color="var(--color-danger)" />
          </div>
          <div className="stat-card-label">Trabajos vencidos</div>
          <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>
            {trabajosVencidos?.length ?? 0}
          </div>
          <div className="stat-card-sub">Entrega vencida sin cobrar</div>
        </div>

        {/* Trabajos terminados */}
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: '#fef3c7' }}>
            <Clock size={20} color="var(--color-warning)" />
          </div>
          <div className="stat-card-label">Terminados s/cobrar</div>
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
            {trabajosTerminados?.length ?? 0}
          </div>
          <div className="stat-card-sub">Pendientes de cobro</div>
        </div>
      </div>

      {/* Lower panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Trabajos vencidos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} color="var(--color-danger)" />
              Trabajos vencidos
            </h2>
            <Link href="/trabajos?filtro=vencidos" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
              Ver todos →
            </Link>
          </div>
          {trabajosVencidos && trabajosVencidos.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {trabajosVencidos.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/trabajos/${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    textDecoration: 'none',
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {t.clientes?.nombre}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {t.descripcion?.substring(0, 40)}… · Vto: {formatDate(t.fecha_estimada_entrega)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-danger)', flexShrink: 0, marginLeft: 8 }}>
                    {formatMonto(t.monto_total)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                ✓ Sin trabajos vencidos
              </div>
            </div>
          )}
        </div>

        {/* Trabajos terminados pendientes */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Receipt size={16} color="var(--color-warning)" />
              Terminados por cobrar
            </h2>
            <Link href="/trabajos?estado=terminado" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
              Ver todos →
            </Link>
          </div>
          {trabajosTerminados && trabajosTerminados.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {trabajosTerminados.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/trabajos/${t.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.625rem 0.75rem',
                    borderRadius: 8,
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    textDecoration: 'none',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }}>
                      {t.clientes?.nombre}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {t.descripcion?.substring(0, 45)}…
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-warning)', flexShrink: 0, marginLeft: 8 }}>
                    {formatMonto(t.monto_total)}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                ✓ No hay pendientes
              </div>
            </div>
          )}
        </div>

        {/* Cheques próximos */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} color="var(--color-warning)" />
              Cheques a cobrar esta semana
            </h2>
            <Link href="/cheques" style={{ fontSize: '0.75rem', color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
              Ver todos →
            </Link>
          </div>
          {chequesProximos && chequesProximos.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Banco</th>
                    <th>Fecha cobro</th>
                    <th style={{ textAlign: 'right' }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {chequesProximos.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.numero}</td>
                      <td style={{ color: 'var(--color-text-muted)' }}>{c.banco || '—'}</td>
                      <td>{formatDate(c.fecha_cobro)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-warning)' }}>
                        {formatMonto(c.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                ✓ Sin cheques próximos a vencer
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
