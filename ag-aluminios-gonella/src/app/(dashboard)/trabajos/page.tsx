'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Plus, Filter, Search, Edit2, Trash2, Loader2, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatMonto } from '@/lib/format'
import type { Trabajo, Cliente } from '@/types/database'

type TrabajoEstado = 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'

const ESTADOS: { value: TrabajoEstado | ''; label: string; badge: string }[] = [
  { value: '', label: 'Todos los estados', badge: '' },
  { value: 'presupuestado', label: 'Presupuestado', badge: 'badge-presupuestado' },
  { value: 'en_ejecucion', label: 'En ejecución', badge: 'badge-en_ejecucion' },
  { value: 'terminado', label: 'Terminado', badge: 'badge-terminado' },
  { value: 'cobrado', label: 'Cobrado', badge: 'badge-cobrado' },
]

const ESTADOS_LABELS: Record<string, string> = {
  presupuestado: 'Presupuestado',
  en_ejecucion: 'En ejecución',
  terminado: 'Terminado',
  cobrado: 'Cobrado',
}

type TrabajoConCliente = Trabajo & { clientes: { nombre: string } | null }

// ─── Modal Form ───────────────────────────────────────────────────────────────
function TrabajoModal({
  trabajo,
  clientes,
  defaultClienteId,
  onClose,
  onSaved,
}: {
  trabajo?: TrabajoConCliente
  clientes: Cliente[]
  defaultClienteId?: string
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    cliente_id: trabajo?.cliente_id ?? defaultClienteId ?? '',
    descripcion: trabajo?.descripcion ?? '',
    monto_total: trabajo?.monto_total?.toString() ?? '',
    estado: (trabajo?.estado ?? 'presupuestado') as TrabajoEstado,
    fecha_inicio: trabajo?.fecha_inicio ?? '',
    fecha_estimada_entrega: trabajo?.fecha_estimada_entrega ?? '',
    observaciones: trabajo?.observaciones ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cliente_id) return toast.error('Seleccioná un cliente')
    if (!form.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (!form.monto_total || isNaN(Number(form.monto_total))) return toast.error('El monto debe ser un número válido')

    setLoading(true)
    const payload = {
      cliente_id: form.cliente_id,
      descripcion: form.descripcion,
      monto_total: Number(form.monto_total),
      estado: form.estado,
      fecha_inicio: form.fecha_inicio || null,
      fecha_estimada_entrega: form.fecha_estimada_entrega || null,
      observaciones: form.observaciones || null,
    }

    if (trabajo) {
      // Registrar historial si cambió el estado
      if (form.estado !== trabajo.estado) {
        await supabase.from('trabajo_estado_historial').insert({
          trabajo_id: trabajo.id,
          estado_anterior: trabajo.estado,
          estado_nuevo: form.estado,
        })
      }
      const { error } = await supabase.from('trabajos').update(payload).eq('id', trabajo.id)
      if (error) { toast.error('Error al actualizar el trabajo'); setLoading(false); return }
      toast.success('Trabajo actualizado correctamente')
    } else {
      const { error } = await supabase.from('trabajos').insert(payload)
      if (error) { toast.error('Error al crear el trabajo'); setLoading(false); return }
      toast.success('Trabajo creado correctamente')
    }
    onSaved()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h2 className="modal-title">{trabajo ? 'Editar trabajo' : 'Nuevo trabajo'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Cliente */}
          <div>
            <label className="form-label" htmlFor="trabajo-cliente">
              Cliente <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <select
              id="trabajo-cliente"
              className="form-input"
              value={form.cliente_id}
              onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="form-label" htmlFor="trabajo-desc">
              Descripción del trabajo <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <textarea
              id="trabajo-desc"
              className="form-input"
              rows={3}
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Ej: Ventana corrediza aluminio 1.50x1.20m con vidrio templado..."
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="grid-2">
            {/* Monto */}
            <div>
              <label className="form-label" htmlFor="trabajo-monto">
                Monto total <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="trabajo-monto"
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                value={form.monto_total}
                onChange={e => setForm(p => ({ ...p, monto_total: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            {/* Estado */}
            <div>
              <label className="form-label" htmlFor="trabajo-estado">Estado</label>
              <select
                id="trabajo-estado"
                className="form-input"
                value={form.estado}
                onChange={e => setForm(p => ({ ...p, estado: e.target.value as TrabajoEstado }))}
              >
                {ESTADOS.filter(e => e.value).map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>

            {/* Fecha inicio */}
            <div>
              <label className="form-label" htmlFor="trabajo-finicio">Fecha de inicio</label>
              <input
                id="trabajo-finicio"
                type="date"
                className="form-input"
                value={form.fecha_inicio}
                onChange={e => setForm(p => ({ ...p, fecha_inicio: e.target.value }))}
              />
            </div>

            {/* Fecha entrega */}
            <div>
              <label className="form-label" htmlFor="trabajo-fentrega">Fecha estimada de entrega</label>
              <input
                id="trabajo-fentrega"
                type="date"
                className="form-input"
                value={form.fecha_estimada_entrega}
                onChange={e => setForm(p => ({ ...p, fecha_estimada_entrega: e.target.value }))}
              />
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="form-label" htmlFor="trabajo-obs">Observaciones</label>
            <textarea
              id="trabajo-obs"
              className="form-input"
              rows={2}
              value={form.observaciones}
              onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
              placeholder="Notas adicionales..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="drawer-footer" style={{ padding: 0, paddingTop: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {trabajo ? 'Guardar cambios' : 'Crear trabajo'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function TrabajosPage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [trabajos, setTrabajos] = useState<TrabajoConCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState<TrabajoEstado | ''>(
    (searchParams.get('estado') as TrabajoEstado) ?? ''
  )
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; trabajo?: TrabajoConCliente }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)

    // Cargar clientes si no tenemos
    if (clientes.length === 0) {
      const { data: cls } = await supabase.from('clientes').select('*').order('nombre')
      setClientes(cls ?? [])
    }

    let query = supabase
      .from('trabajos')
      .select('*, clientes(nombre)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (estadoFiltro) query = query.eq('estado', estadoFiltro)

    if (searchParams.get('filtro') === 'vencidos') {
      const today = new Date().toISOString().split('T')[0]
      query = query
        .lt('fecha_estimada_entrega', today)
        .neq('estado', 'cobrado')
        .neq('estado', 'presupuestado')
    }

    const { data, count, error } = await query
    if (!error) {
      setTrabajos((data as TrabajoConCliente[]) ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [page, estadoFiltro])

  const handleDelete = async (t: TrabajoConCliente) => {
    if (!confirm(`¿Eliminar el trabajo "${t.descripcion.substring(0, 40)}…"? Esta acción no se puede deshacer.`)) return
    setDeleting(t.id)
    const { error } = await supabase.from('trabajos').delete().eq('id', t.id)
    if (error) toast.error('Error al eliminar el trabajo')
    else { toast.success('Trabajo eliminado'); fetchData() }
    setDeleting(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Trabajos</h1>
        <button id="nuevo-trabajo-btn" className="btn btn-accent" onClick={() => setModal({ open: true })}>
          <Plus size={16} /> Nuevo trabajo
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar trabajos..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {ESTADOS.map(e => (
            <button
              key={e.value}
              className={`btn btn-sm ${estadoFiltro === e.value ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => { setEstadoFiltro(e.value); setPage(0) }}
            >
              {e.value ? <span className={`badge ${e.badge}`} style={{ background: 'none', padding: 0, color: 'inherit' }}>{e.label}</span> : e.label}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {total} trabajos
        </span>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>F. inicio</th>
              <th>F. entrega</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
                </td>
              </tr>
            ) : trabajos.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-title">No hay trabajos</div>
                    <div className="empty-state-desc">Creá el primer trabajo con el botón de arriba.</div>
                  </div>
                </td>
              </tr>
            ) : (
              trabajos.map(t => {
                const today = new Date().toISOString().split('T')[0]
                const vencido = t.fecha_estimada_entrega && t.fecha_estimada_entrega < today && t.estado !== 'cobrado'
                return (
                  <tr key={t.id} style={vencido ? { background: '#fff5f5' } : {}}>
                    <td style={{ fontWeight: 500 }}>{t.clientes?.nombre}</td>
                    <td style={{ maxWidth: 280 }}>
                      <a href={`/trabajos/${t.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
                        {t.descripcion.substring(0, 60)}{t.descripcion.length > 60 ? '…' : ''}
                      </a>
                    </td>
                    <td>
                      <span className={`badge badge-${t.estado}`}>
                        {ESTADOS_LABELS[t.estado]}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{formatDate(t.fecha_inicio)}</td>
                    <td style={{ fontSize: '0.8125rem', color: vencido ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: vencido ? 600 : 400 }}>
                      {formatDate(t.fecha_estimada_entrega)}
                      {vencido && ' ⚠'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMonto(t.monto_total)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                        <a href={`/trabajos/${t.id}`} className="btn btn-ghost btn-sm">Ver</a>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, trabajo: t })}>
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDelete(t)}
                          disabled={deleting === t.id}
                        >
                          {deleting === t.id ? <Loader2 size={14} /> : <Trash2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</span>
            <div className="pagination-pages">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <button key={i} className={`pagination-btn${page === i ? ' active' : ''}`} onClick={() => setPage(i)}>{i + 1}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <TrabajoModal
          trabajo={modal.trabajo}
          clientes={clientes}
          defaultClienteId={searchParams.get('cliente') ?? undefined}
          onClose={() => setModal({ open: false })}
          onSaved={fetchData}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
