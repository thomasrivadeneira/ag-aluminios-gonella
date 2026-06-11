'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatMonto } from '@/lib/format'
import type { Cliente, Trabajo } from '@/types/database'

type FiltroCC = 'todos' | 'con_saldo' | 'vencidos'

interface TrabajoCC extends Trabajo {
  cobrado: number
  senias: number
  pendiente: number
}

export default function CuentaCorrientePage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [trabajosCC, setTrabajosCC] = useState<TrabajoCC[]>([])
  const [filtro, setFiltro] = useState<FiltroCC>('con_saldo')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('clientes').select('*').order('nombre').then(({ data }) => {
      setClientes(data ?? [])
    })
  }, [])

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.cuit_dni ?? '').includes(search)
  )

  const fetchCC = async (cliente: Cliente) => {
    setLoading(true)
    setSelectedCliente(cliente)

    const { data: trabajos } = await supabase
      .from('trabajos')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    const { data: pagos } = await supabase
      .from('movimientos_caja')
      .select('trabajo_id, monto, tipo, es_senia')
      .eq('cliente_id', cliente.id)
      .eq('tipo', 'ingreso')

    const pagoMap = new Map<string, { cobrado: number; senias: number }>()
    pagos?.forEach(p => {
      const curr = pagoMap.get(p.trabajo_id ?? '') ?? { cobrado: 0, senias: 0 }
      curr.cobrado += p.monto
      if (p.es_senia) curr.senias += p.monto
      pagoMap.set(p.trabajo_id ?? '', curr)
    })

    const today = new Date().toISOString().split('T')[0]
    const resultado: TrabajoCC[] = (trabajos ?? []).map(t => {
      const { cobrado = 0, senias = 0 } = pagoMap.get(t.id) ?? {}
      return { ...t, cobrado, senias, pendiente: Math.max(0, t.monto_total - cobrado) }
    })

    setTrabajosCC(resultado)
    setLoading(false)
  }

  const today = new Date().toISOString().split('T')[0]
  const trabajosMostrados = trabajosCC.filter(t => {
    if (filtro === 'con_saldo') return t.pendiente > 0
    if (filtro === 'vencidos') return t.fecha_estimada_entrega && t.fecha_estimada_entrega < today && t.estado !== 'cobrado'
    return true
  })

  const totalPendiente = trabajosMostrados.reduce((s, t) => s + t.pendiente, 0)
  const totalCobrado = trabajosMostrados.reduce((s, t) => s + t.cobrado, 0)
  const totalTotal = trabajosMostrados.reduce((s, t) => s + t.monto_total, 0)

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cuenta Corriente</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Lista clientes */}
        <div className="card" style={{ padding: '1rem' }}>
          <div className="search-wrapper" style={{ marginBottom: '0.75rem' }}>
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              style={{ width: '100%' }}
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 500, overflowY: 'auto' }}>
            {clientesFiltrados.map(c => (
              <button
                key={c.id}
                onClick={() => fetchCC(c)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.625rem 0.75rem',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedCliente?.id === c.id ? 'var(--color-primary)' : 'transparent',
                  color: selectedCliente?.id === c.id ? 'white' : 'var(--color-text)',
                  fontSize: '0.875rem',
                  fontWeight: selectedCliente?.id === c.id ? 600 : 400,
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => {
                  if (selectedCliente?.id !== c.id) e.currentTarget.style.background = 'var(--color-surface-2)'
                }}
                onMouseOut={e => {
                  if (selectedCliente?.id !== c.id) e.currentTarget.style.background = 'transparent'
                }}
              >
                {c.nombre}
                {c.cuit_dni && (
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 1 }}>{c.cuit_dni}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Detalle CC */}
        <div>
          {!selectedCliente ? (
            <div className="card">
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div className="empty-state-title">Seleccioná un cliente</div>
                <div className="empty-state-desc">Elegí un cliente de la lista para ver su cuenta corriente.</div>
              </div>
            </div>
          ) : loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
            </div>
          ) : (
            <>
              {/* Resumen del cliente */}
              <div style={{ marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  {selectedCliente.nombre}
                </h2>
                <div className="grid-3" style={{ marginBottom: '1rem' }}>
                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-card-label">Total trabajos</div>
                    <div className="stat-card-value" style={{ fontSize: '1.25rem' }}>{formatMonto(totalTotal)}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '1rem' }}>
                    <div className="stat-card-label">Total cobrado</div>
                    <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--color-accent-dark)' }}>{formatMonto(totalCobrado)}</div>
                  </div>
                  <div className="stat-card" style={{ padding: '1rem', borderLeft: `4px solid ${totalPendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent)'}` }}>
                    <div className="stat-card-label">Saldo pendiente</div>
                    <div className="stat-card-value" style={{ fontSize: '1.25rem', color: totalPendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}>
                      {formatMonto(totalPendiente)}
                    </div>
                  </div>
                </div>

                {/* Filtros */}
                <div style={{ display: 'flex', gap: '0.375rem' }}>
                  {([
                    { value: 'con_saldo', label: 'Con saldo' },
                    { value: 'vencidos', label: 'Vencidos' },
                    { value: 'todos', label: 'Todos' },
                  ] as { value: FiltroCC; label: string }[]).map(f => (
                    <button
                      key={f.value}
                      className={`btn btn-sm ${filtro === f.value ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setFiltro(f.value)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Trabajo</th>
                      <th>Estado</th>
                      <th>F. entrega</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th style={{ textAlign: 'right' }}>Cobrado</th>
                      <th style={{ textAlign: 'right' }}>Señas</th>
                      <th style={{ textAlign: 'right' }}>Pendiente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trabajosMostrados.length === 0 ? (
                      <tr>
                        <td colSpan={7}>
                          <div className="empty-state" style={{ padding: '1.5rem' }}>
                            <div className="empty-state-title">Sin resultados</div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      trabajosMostrados.map(t => {
                        const vencido = t.fecha_estimada_entrega && t.fecha_estimada_entrega < today && t.estado !== 'cobrado'
                        return (
                          <tr key={t.id} style={vencido ? { background: '#fff5f5' } : {}}>
                            <td>
                              <a href={`/trabajos/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none', fontWeight: 500 }}>
                                {t.descripcion.substring(0, 50)}{t.descripcion.length > 50 ? '…' : ''}
                              </a>
                            </td>
                            <td>
                              <span className={`badge ${ESTADO_BADGE[t.estado]}`}>{ESTADO_LABELS[t.estado]}</span>
                            </td>
                            <td style={{ fontSize: '0.8125rem', color: vencido ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: vencido ? 600 : 400 }}>
                              {formatDate(t.fecha_estimada_entrega)}
                              {vencido && ' ⚠'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMonto(t.monto_total)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(t.cobrado)}</td>
                            <td style={{ textAlign: 'right', color: 'var(--color-text-muted)' }}>{formatMonto(t.senias)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: t.pendiente > 0 ? 'var(--color-danger)' : 'var(--color-accent-dark)' }}>
                              {formatMonto(t.pendiente)}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
