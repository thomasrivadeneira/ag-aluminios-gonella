'use client'

import { useState, useEffect } from 'react'
import { Plus, ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatMonto, todayString } from '@/lib/format'
import type { MovimientoConRelaciones, Cliente, Trabajo, CategoriaEgreso } from '@/types/database'

const MEDIOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'cheque_tercero', label: 'Cheque de tercero' },
  { value: 'cheque_propio', label: 'Cheque propio' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
]

const MEDIO_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque_tercero: 'Cheque 3°',
  cheque_propio: 'Cheque propio',
  debito: 'Débito',
  credito: 'Crédito',
}

// ─── Drawer de movimiento ─────────────────────────────────────────────────────
function MovimientoDrawer({
  fecha,
  tipo: tipoDefault,
  clientes,
  trabajos,
  categorias,
  onClose,
  onSaved,
}: {
  fecha: string
  tipo: 'ingreso' | 'egreso'
  clientes: Cliente[]
  trabajos: Trabajo[]
  categorias: CategoriaEgreso[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    tipo: tipoDefault,
    fecha,
    concepto: '',
    categoria_id: '',
    cliente_id: '',
    trabajo_id: '',
    monto: '',
    medio_pago: 'efectivo',
    es_senia: false,
    notas: '',
  })

  const trabajosFiltrados = form.cliente_id
    ? trabajos.filter(t => t.cliente_id === form.cliente_id && t.estado !== 'cobrado')
    : trabajos.filter(t => t.estado !== 'cobrado')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.concepto.trim()) return toast.error('El concepto es obligatorio')
    if (!form.monto || isNaN(Number(form.monto))) return toast.error('El monto debe ser un número válido')
    if (form.tipo === 'egreso' && !form.categoria_id) return toast.error('Seleccioná una categoría para el egreso')
    if (form.es_senia && !form.trabajo_id) return toast.error('Una seña debe estar vinculada a un trabajo')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('movimientos_caja').insert({
      tipo: form.tipo as 'ingreso' | 'egreso',
      fecha: form.fecha,
      concepto: form.concepto,
      categoria_id: form.categoria_id || null,
      cliente_id: form.cliente_id || null,
      trabajo_id: form.trabajo_id || null,
      monto: Number(form.monto),
      medio_pago: form.medio_pago as any,
      es_senia: form.es_senia,
      notas: form.notas || null,
      usuario_id: user?.id,
    })

    if (error) {
      toast.error('Error al registrar el movimiento')
      setLoading(false)
      return
    }
    toast.success(`${form.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'} registrado correctamente`)
    onSaved()
    onClose()
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-header">
          <h2 className="drawer-title">
            {form.tipo === 'ingreso' ? '📈 Nuevo ingreso' : '📉 Nuevo egreso'}
          </h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="drawer-body">
          <form id="movimiento-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tipo */}
            <div>
              <label className="form-label">Tipo</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['ingreso', 'egreso'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-sm ${form.tipo === t ? (t === 'ingreso' ? 'btn-accent' : 'btn-danger') : 'btn-ghost'}`}
                    style={{ flex: 1 }}
                    onClick={() => setForm(p => ({ ...p, tipo: t }))}
                  >
                    {t === 'ingreso' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Fecha */}
            <div>
              <label className="form-label" htmlFor="mov-fecha">Fecha</label>
              <input
                id="mov-fecha"
                type="date"
                className="form-input"
                value={form.fecha}
                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
              />
            </div>

            {/* Concepto */}
            <div>
              <label className="form-label" htmlFor="mov-concepto">
                Concepto <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="mov-concepto"
                type="text"
                className="form-input"
                value={form.concepto}
                onChange={e => setForm(p => ({ ...p, concepto: e.target.value }))}
                placeholder="Ej: Pago parcial ventana, Compra perfil aluminio..."
                required
              />
            </div>

            {/* Categoría (egresos) */}
            {form.tipo === 'egreso' && (
              <div>
                <label className="form-label" htmlFor="mov-categoria">
                  Categoría <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <select
                  id="mov-categoria"
                  className="form-input"
                  value={form.categoria_id}
                  onChange={e => setForm(p => ({ ...p, categoria_id: e.target.value }))}
                  required={form.tipo === 'egreso'}
                >
                  <option value="">Seleccionar categoría...</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="form-label" htmlFor="mov-monto">
                Monto <span style={{ color: 'var(--color-danger)' }}>*</span>
              </label>
              <input
                id="mov-monto"
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                value={form.monto}
                onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            {/* Medio de pago */}
            <div>
              <label className="form-label" htmlFor="mov-medio">Medio de pago</label>
              <select
                id="mov-medio"
                className="form-input"
                value={form.medio_pago}
                onChange={e => setForm(p => ({ ...p, medio_pago: e.target.value }))}
              >
                {MEDIOS_PAGO.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className="form-label" htmlFor="mov-cliente">Cliente (opcional)</label>
              <select
                id="mov-cliente"
                className="form-input"
                value={form.cliente_id}
                onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value, trabajo_id: '' }))}
              >
                <option value="">Sin cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            {/* Trabajo */}
            <div>
              <label className="form-label" htmlFor="mov-trabajo">
                Trabajo vinculado {form.es_senia && <span style={{ color: 'var(--color-danger)' }}>*</span>}
              </label>
              <select
                id="mov-trabajo"
                className="form-input"
                value={form.trabajo_id}
                onChange={e => setForm(p => ({ ...p, trabajo_id: e.target.value }))}
              >
                <option value="">Sin trabajo</option>
                {trabajosFiltrados.map(t => (
                  <option key={t.id} value={t.id}>{t.descripcion.substring(0, 50)}</option>
                ))}
              </select>
            </div>

            {/* Es seña */}
            {form.tipo === 'ingreso' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  id="mov-senia"
                  type="checkbox"
                  checked={form.es_senia}
                  onChange={e => setForm(p => ({ ...p, es_senia: e.target.checked }))}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <label htmlFor="mov-senia" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                  Es una seña / anticipo
                </label>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="form-label" htmlFor="mov-notas">Notas</label>
              <textarea
                id="mov-notas"
                className="form-input"
                rows={2}
                value={form.notas}
                onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                placeholder="Observaciones adicionales..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </form>
        </div>
        <div className="drawer-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" form="movimiento-form" className="btn btn-accent" disabled={loading}>
            {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            Registrar {form.tipo}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CajaPage() {
  const supabase = createClient()
  const [fecha, setFecha] = useState(todayString())
  const [movimientos, setMovimientos] = useState<MovimientoConRelaciones[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [trabajos, setTrabajos] = useState<Trabajo[]>([])
  const [categorias, setCategorias] = useState<CategoriaEgreso[]>([])
  const [saldoAcumulado, setSaldoAcumulado] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [drawer, setDrawer] = useState<{ open: boolean; tipo: 'ingreso' | 'egreso' }>({ open: false, tipo: 'ingreso' })
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const [{ data: movs }, { data: cls }, { data: trabs }, { data: cats }] = await Promise.all([
      supabase
        .from('movimientos_caja')
        .select('*, clientes(nombre), trabajos(descripcion), categorias_egreso(nombre)')
        .eq('fecha', fecha)
        .order('created_at', { ascending: false }),
      supabase.from('clientes').select('*').order('nombre'),
      supabase.from('trabajos').select('*').neq('estado', 'cobrado').order('created_at', { ascending: false }),
      supabase.from('categorias_egreso').select('*').order('nombre'),
    ])

    setMovimientos((movs as MovimientoConRelaciones[]) ?? [])
    setClientes(cls ?? [])
    setTrabajos(trabs ?? [])
    setCategorias(cats ?? [])

    // Saldo acumulado
    const { data: todos } = await supabase.from('movimientos_caja').select('tipo, monto').lte('fecha', fecha)
    const acumulado = (todos ?? []).reduce((s, m) => s + (m.tipo === 'ingreso' ? m.monto : -m.monto), 0)
    setSaldoAcumulado(acumulado)

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [fecha])

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso')
  const egresos = movimientos.filter(m => m.tipo === 'egreso')
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0)
  const totalEgresos = egresos.reduce((s, m) => s + m.monto, 0)
  const saldoDia = totalIngresos - totalEgresos

  // Subtotales por medio de pago
  const subtotalesMedio = MEDIOS_PAGO.map(mp => {
    const ing = ingresos.filter(m => m.medio_pago === mp.value).reduce((s, m) => s + m.monto, 0)
    const egr = egresos.filter(m => m.medio_pago === mp.value).reduce((s, m) => s + m.monto, 0)
    return { ...mp, ingreso: ing, egreso: egr, neto: ing - egr }
  }).filter(s => s.ingreso > 0 || s.egreso > 0)

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    setDeleting(id)
    const { error } = await supabase.from('movimientos_caja').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Movimiento eliminado'); fetchData() }
    setDeleting(null)
  }

  const prevDay = () => {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    setFecha(d.toISOString().split('T')[0])
  }
  const nextDay = () => {
    const d = new Date(fecha + 'T12:00:00')
    d.setDate(d.getDate() + 1)
    setFecha(d.toISOString().split('T')[0])
  }

  const MovRow = ({ m }: { m: MovimientoConRelaciones }) => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto auto',
        gap: '0.5rem',
        alignItems: 'start',
        padding: '0.75rem',
        borderRadius: 8,
        background: m.tipo === 'ingreso' ? '#f0fdf4' : '#fef2f2',
        border: `1px solid ${m.tipo === 'ingreso' ? '#bbf7d0' : '#fecaca'}`,
      }}
    >
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{m.concepto}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: 3, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          <span>{MEDIO_LABEL[m.medio_pago]}</span>
          {(m as any).clientes?.nombre && <span>· {(m as any).clientes.nombre}</span>}
          {(m as any).categorias_egreso?.nombre && <span>· {(m as any).categorias_egreso.nombre}</span>}
          {m.es_senia && <span className="badge badge-presupuestado" style={{ fontSize: '0.6875rem' }}>Seña</span>}
        </div>
      </div>
      <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: m.tipo === 'ingreso' ? 'var(--color-accent-dark)' : 'var(--color-danger)', whiteSpace: 'nowrap' }}>
        {m.tipo === 'egreso' ? '-' : '+'}{formatMonto(m.monto)}
      </div>
      <button
        className="btn btn-ghost btn-sm"
        style={{ color: 'var(--color-danger)', padding: '0.2rem 0.4rem' }}
        onClick={() => handleDelete(m.id)}
        disabled={deleting === m.id}
      >
        {deleting === m.id ? <Loader2 size={13} /> : <X size={13} />}
      </button>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Caja del día</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button id="btn-ingreso" className="btn btn-accent" onClick={() => setDrawer({ open: true, tipo: 'ingreso' })}>
            <ArrowUpCircle size={16} /> Ingreso
          </button>
          <button id="btn-egreso" className="btn btn-danger" onClick={() => setDrawer({ open: true, tipo: 'egreso' })}>
            <ArrowDownCircle size={16} /> Egreso
          </button>
        </div>
      </div>

      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={prevDay}><ChevronLeft size={16} /></button>
        <input
          id="fecha-caja"
          type="date"
          className="form-input"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          style={{ width: 170 }}
        />
        <button className="btn btn-ghost btn-sm" onClick={nextDay} disabled={fecha >= todayString()}><ChevronRight size={16} /></button>
        {fecha === todayString() && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--color-accent)', fontWeight: 600 }}>Hoy</span>
        )}
      </div>

      {/* Saldo cards */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Total ingresos</div>
          <div className="stat-card-value" style={{ color: 'var(--color-accent-dark)', fontSize: '1.5rem' }}>{formatMonto(totalIngresos)}</div>
          <div className="stat-card-sub">{ingresos.length} movimientos</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total egresos</div>
          <div className="stat-card-value" style={{ color: 'var(--color-danger)', fontSize: '1.5rem' }}>{formatMonto(totalEgresos)}</div>
          <div className="stat-card-sub">{egresos.length} movimientos</div>
        </div>
        <div className="stat-card" style={{ borderLeft: `4px solid ${saldoDia >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'}` }}>
          <div className="stat-card-label">Saldo del día</div>
          <div className="stat-card-value" style={{ color: saldoDia >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)', fontSize: '1.5rem' }}>{formatMonto(saldoDia)}</div>
          <div className="stat-card-sub">Acumulado: <strong style={{ color: saldoAcumulado >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>{formatMonto(saldoAcumulado)}</strong></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Ingresos */}
        <div className="card">
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent-dark)' }}>
            <ArrowUpCircle size={16} /> Ingresos
          </h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /></div>
          ) : ingresos.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-title">Sin ingresos</div>
              <div className="empty-state-desc">Registrá el primer ingreso del día.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ingresos.map(m => <MovRow key={m.id} m={m} />)}
            </div>
          )}
        </div>

        {/* Egresos */}
        <div className="card">
          <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-danger)' }}>
            <ArrowDownCircle size={16} /> Egresos
          </h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /></div>
          ) : egresos.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <div className="empty-state-title">Sin egresos</div>
              <div className="empty-state-desc">Registrá el primer egreso del día.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {egresos.map(m => <MovRow key={m.id} m={m} />)}
            </div>
          )}
        </div>

        {/* Subtotales por medio */}
        {subtotalesMedio.length > 0 && (
          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Desglose por medio de pago</h2>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Medio de pago</th>
                    <th style={{ textAlign: 'right' }}>Ingresos</th>
                    <th style={{ textAlign: 'right' }}>Egresos</th>
                    <th style={{ textAlign: 'right' }}>Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {subtotalesMedio.map(s => (
                    <tr key={s.value}>
                      <td style={{ fontWeight: 500 }}>{s.label}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(s.ingreso)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatMonto(s.egreso)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: s.neto >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>{formatMonto(s.neto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {drawer.open && (
        <MovimientoDrawer
          fecha={fecha}
          tipo={drawer.tipo}
          clientes={clientes}
          trabajos={trabajos}
          categorias={categorias}
          onClose={() => setDrawer({ open: false, tipo: 'ingreso' })}
          onSaved={fetchData}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
