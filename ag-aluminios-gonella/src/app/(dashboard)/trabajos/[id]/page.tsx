import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { formatDate, formatMonto } from '@/lib/format'

const ESTADO_BADGE: Record<string, string> = {
  presupuestado: 'badge-presupuestado',
  en_ejecucion: 'badge-en_ejecucion',
  terminado: 'badge-terminado',
  cobrado: 'badge-cobrado',
}
const ESTADO_LABELS: Record<string, string> = {
  presupuestado: 'Presupuestado',
  en_ejecucion: 'En ejecución',
  terminado: 'Terminado',
  cobrado: 'Cobrado',
}

export default async function TrabajoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: trabajo } = await supabase
    .from('trabajos')
    .select('*, clientes(id, nombre)')
    .eq('id', id)
    .single()

  if (!trabajo) notFound()

  const { data: historial } = await supabase
    .from('trabajo_estado_historial')
    .select('*')
    .eq('trabajo_id', id)
    .order('created_at', { ascending: false })

  const { data: pagos } = await supabase
    .from('movimientos_caja')
    .select('*, categorias_egreso(nombre)')
    .eq('trabajo_id', id)
    .order('fecha', { ascending: false })

  const totalCobrado = pagos?.filter(p => p.tipo === 'ingreso').reduce((s, p) => s + p.monto, 0) ?? 0
  const senias = pagos?.filter(p => p.es_senia).reduce((s, p) => s + p.monto, 0) ?? 0
  const pendiente = Math.max(0, trabajo.monto_total - totalCobrado)

  return (
    <div>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href="/trabajos" className="btn btn-ghost btn-sm">
          <ArrowLeft size={15} /> Volver a trabajos
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span className={`badge ${ESTADO_BADGE[trabajo.estado]}`}>{ESTADO_LABELS[trabajo.estado]}</span>
            {trabajo.clientes && (
              <Link href={`/clientes/${(trabajo.clientes as any).id}`} style={{ fontSize: '0.875rem', color: 'var(--color-accent)', textDecoration: 'none' }}>
                {(trabajo.clientes as any).nombre}
              </Link>
            )}
          </div>
          <h1 className="page-title" style={{ fontSize: '1.25rem' }}>{trabajo.descripcion}</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Pagos */}
        <div>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Resumen financiero</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--color-surface)', borderRadius: 10 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Total</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{formatMonto(trabajo.monto_total)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: '#ecfdf5', borderRadius: 10 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-accent-dark)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Cobrado</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-accent-dark)' }}>{formatMonto(totalCobrado)}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: pendiente > 0 ? '#fef2f2' : '#ecfdf5', borderRadius: 10 }}>
                <div style={{ fontSize: '0.75rem', color: pendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Pendiente</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: pendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}>{formatMonto(pendiente)}</div>
              </div>
            </div>
            {senias > 0 && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                Incluye señas: {formatMonto(senias)}
              </div>
            )}
          </div>

          {/* Movimientos */}
          <div className="card">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>
              Movimientos vinculados ({pagos?.length ?? 0})
            </h2>
            {pagos && pagos.length > 0 ? (
              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Medio</th>
                      <th style={{ textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map(p => (
                      <tr key={p.id}>
                        <td style={{ fontSize: '0.8125rem' }}>{formatDate(p.fecha)}</td>
                        <td>
                          <div style={{ fontSize: '0.875rem' }}>{p.concepto}</div>
                          {p.es_senia && <span className="badge badge-presupuestado" style={{ fontSize: '0.625rem' }}>Seña</span>}
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {p.medio_pago.replace('_', ' ')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: p.tipo === 'ingreso' ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
                          {p.tipo === 'egreso' ? '-' : '+'}{formatMonto(p.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-state-title">Sin movimientos</div>
                <div className="empty-state-desc">Registrá un pago desde la Caja vinculando este trabajo.</div>
              </div>
            )}
          </div>
        </div>

        {/* Info + historial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Detalles</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Inicio</span>
                <span>{formatDate(trabajo.fecha_inicio)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Entrega estimada</span>
                <span>{formatDate(trabajo.fecha_estimada_entrega)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Creado</span>
                <span>{formatDate(trabajo.created_at)}</span>
              </div>
            </div>
            {trabajo.observaciones && (
              <div style={{ marginTop: '0.75rem', padding: '0.625rem', background: 'var(--color-surface)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                {trabajo.observaciones}
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={15} /> Historial de estados
            </h2>
            {historial && historial.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historial.map(h => (
                  <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0.5rem 0.625rem', borderRadius: 8, background: 'var(--color-surface)', borderLeft: '3px solid var(--color-accent)' }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>
                      {ESTADO_LABELS[h.estado_anterior ?? ''] ?? '—'} → {ESTADO_LABELS[h.estado_nuevo]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(h.created_at)}
                      {h.notas && ` · ${h.notas}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Sin cambios de estado registrados.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
