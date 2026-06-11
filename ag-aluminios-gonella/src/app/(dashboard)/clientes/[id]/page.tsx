import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { formatDate, formatMonto } from '@/lib/format'

const estadoBadge = (estado: string) => {
  const map: Record<string, string> = {
    presupuestado: 'badge-presupuestado',
    en_ejecucion: 'badge-en_ejecucion',
    terminado: 'badge-terminado',
    cobrado: 'badge-cobrado',
  }
  const labels: Record<string, string> = {
    presupuestado: 'Presupuestado',
    en_ejecucion: 'En ejecución',
    terminado: 'Terminado',
    cobrado: 'Cobrado',
  }
  return <span className={`badge ${map[estado] ?? ''}`}>{labels[estado] ?? estado}</span>
}

export default async function ClienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (!cliente) notFound()

  const { data: trabajos } = await supabase
    .from('trabajos')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  // Calcular totales de cuenta corriente
  const { data: pagos } = await supabase
    .from('movimientos_caja')
    .select('trabajo_id, monto, tipo, es_senia')
    .eq('cliente_id', id)
    .eq('tipo', 'ingreso')

  const pagosPorTrabajo = new Map<string, { cobrado: number; senias: number }>()
  pagos?.forEach(p => {
    const curr = pagosPorTrabajo.get(p.trabajo_id ?? '') ?? { cobrado: 0, senias: 0 }
    curr.cobrado += p.monto
    if (p.es_senia) curr.senias += p.monto
    pagosPorTrabajo.set(p.trabajo_id ?? '', curr)
  })

  const totalPendiente = trabajos?.reduce((sum, t) => {
    if (t.estado === 'cobrado') return sum
    const { cobrado = 0 } = pagosPorTrabajo.get(t.id) ?? {}
    return sum + Math.max(0, t.monto_total - cobrado)
  }, 0) ?? 0

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/clientes" className="btn btn-ghost btn-sm" style={{ marginBottom: '0.75rem' }}>
          <ArrowLeft size={15} /> Volver a clientes
        </Link>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{cliente.nombre}</h1>
            {cliente.cuit_dni && (
              <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                CUIT/DNI: {cliente.cuit_dni}
              </p>
            )}
          </div>
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderRadius: 12,
              background: totalPendiente > 0 ? '#fee2e2' : '#d1fae5',
              border: `1px solid ${totalPendiente > 0 ? '#fca5a5' : '#6ee7b7'}`,
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Saldo pendiente total
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalPendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}>
              {formatMonto(totalPendiente)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Info card */}
        <div className="card">
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Datos de contacto</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {cliente.telefono && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                <Phone size={15} color="var(--color-text-muted)" />
                <a href={`tel:${cliente.telefono}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                  {cliente.telefono}
                </a>
              </div>
            )}
            {cliente.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.875rem' }}>
                <Mail size={15} color="var(--color-text-muted)" />
                <a href={`mailto:${cliente.email}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                  {cliente.email}
                </a>
              </div>
            )}
            {cliente.direccion && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem' }}>
                <MapPin size={15} color="var(--color-text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{cliente.direccion}</span>
              </div>
            )}
            {cliente.notas && (
              <div style={{ marginTop: '0.5rem', padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                <FileText size={13} style={{ display: 'inline', marginRight: 4 }} />
                {cliente.notas}
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Cliente desde {formatDate(cliente.created_at)}
            </div>
          </div>
        </div>

        {/* Trabajos */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
              Historial de trabajos ({trabajos?.length ?? 0})
            </h2>
            <Link href={`/trabajos/nuevo?cliente=${id}`} className="btn btn-accent btn-sm">
              + Nuevo trabajo
            </Link>
          </div>

          {trabajos && trabajos.length > 0 ? (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th style={{ textAlign: 'right' }}>Cobrado</th>
                    <th style={{ textAlign: 'right' }}>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {trabajos.map(t => {
                    const { cobrado = 0 } = pagosPorTrabajo.get(t.id) ?? {}
                    const pendiente = Math.max(0, t.monto_total - cobrado)
                    return (
                      <tr key={t.id}>
                        <td>
                          <Link href={`/trabajos/${t.id}`} style={{ fontWeight: 500, color: 'var(--color-text)', textDecoration: 'none' }}>
                            {t.descripcion.substring(0, 50)}{t.descripcion.length > 50 ? '…' : ''}
                          </Link>
                          {t.fecha_estimada_entrega && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                              Entrega: {formatDate(t.fecha_estimada_entrega)}
                            </div>
                          )}
                        </td>
                        <td>{estadoBadge(t.estado)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMonto(t.monto_total)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(cobrado)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: pendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}>
                          {formatMonto(pendiente)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Sin trabajos registrados</div>
              <div className="empty-state-desc">Creá el primer trabajo para este cliente.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
