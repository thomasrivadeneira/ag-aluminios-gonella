'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2, X, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatMonto, todayString } from '@/lib/format'
import { addDays } from 'date-fns'
import type { ChequeConCliente, Cliente, ChequeEstado } from '@/types/database'

const ESTADOS: ChequeEstado[] = ['en_cartera', 'cobrado', 'rechazado', 'endosado']
const ESTADO_LABELS: Record<ChequeEstado, string> = {
  en_cartera: 'En cartera',
  cobrado: 'Cobrado',
  rechazado: 'Rechazado',
  endosado: 'Endosado',
}
const ESTADO_BADGE: Record<ChequeEstado, string> = {
  en_cartera: 'badge-en_cartera',
  cobrado: 'badge-cobrado-cheque',
  rechazado: 'badge-rechazado',
  endosado: 'badge-endosado',
}

// ─── Form Modal ────────────────────────────────────────────────────────────────
function ChequeModal({
  cheque,
  clientes,
  onClose,
  onSaved,
}: {
  cheque?: ChequeConCliente
  clientes: Cliente[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    numero: cheque?.numero ?? '',
    banco: cheque?.banco ?? '',
    titular: cheque?.titular ?? '',
    monto: cheque?.monto?.toString() ?? '',
    fecha_emision: cheque?.fecha_emision ?? '',
    fecha_cobro: cheque?.fecha_cobro ?? '',
    cliente_id: cheque?.cliente_id ?? '',
    notas: cheque?.notas ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.numero.trim()) return toast.error('El número de cheque es obligatorio')
    if (!form.monto || isNaN(Number(form.monto))) return toast.error('El monto debe ser un número válido')

    setLoading(true)
    const payload = {
      numero: form.numero,
      banco: form.banco || null,
      titular: form.titular || null,
      monto: Number(form.monto),
      fecha_emision: form.fecha_emision || null,
      fecha_cobro: form.fecha_cobro || null,
      cliente_id: form.cliente_id || null,
      notas: form.notas || null,
    }

    if (cheque) {
      const { error } = await supabase.from('cheques').update(payload).eq('id', cheque.id)
      if (error) { toast.error('Error al actualizar'); setLoading(false); return }
      toast.success('Cheque actualizado')
    } else {
      const { error } = await supabase.from('cheques').insert({ ...payload, estado: 'en_cartera' })
      if (error) { toast.error('Error al crear'); setLoading(false); return }
      toast.success('Cheque registrado')
    }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h2 className="modal-title">{cheque ? 'Editar cheque' : 'Nuevo cheque'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="grid-2">
            <div>
              <label className="form-label" htmlFor="ch-numero">Nº de cheque *</label>
              <input id="ch-numero" type="text" className="form-input" value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} required placeholder="000012345" />
            </div>
            <div>
              <label className="form-label" htmlFor="ch-banco">Banco</label>
              <input id="ch-banco" type="text" className="form-input" value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} placeholder="Ej: Galicia, Santander..." />
            </div>
            <div>
              <label className="form-label" htmlFor="ch-titular">Titular</label>
              <input id="ch-titular" type="text" className="form-input" value={form.titular} onChange={e => setForm(p => ({ ...p, titular: e.target.value }))} placeholder="Nombre del firmante" />
            </div>
            <div>
              <label className="form-label" htmlFor="ch-monto">Monto *</label>
              <input id="ch-monto" type="number" step="0.01" min="0" className="form-input" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))} required placeholder="0.00" />
            </div>
            <div>
              <label className="form-label" htmlFor="ch-femision">Fecha de emisión</label>
              <input id="ch-femision" type="date" className="form-input" value={form.fecha_emision} onChange={e => setForm(p => ({ ...p, fecha_emision: e.target.value }))} />
            </div>
            <div>
              <label className="form-label" htmlFor="ch-fcobro">Fecha de cobro</label>
              <input id="ch-fcobro" type="date" className="form-input" value={form.fecha_cobro} onChange={e => setForm(p => ({ ...p, fecha_cobro: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="ch-cliente">Cliente (quién lo entregó)</label>
            <select id="ch-cliente" className="form-input" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}>
              <option value="">Sin cliente</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="ch-notas">Notas</label>
            <textarea id="ch-notas" className="form-input" rows={2} value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div className="drawer-footer" style={{ padding: 0, paddingTop: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {cheque ? 'Guardar' : 'Registrar cheque'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Cobrar / Endosar Modal ────────────────────────────────────────────────────
function AccionModal({
  cheque,
  accion,
  onClose,
  onSaved,
}: {
  cheque: ChequeConCliente
  accion: 'cobrar' | 'endosar' | 'rechazar'
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [nota, setNota] = useState('')

  const handleAction = async () => {
    setLoading(true)
    let nuevoEstado: ChequeEstado = 'cobrado'
    if (accion === 'endosar') nuevoEstado = 'endosado'
    if (accion === 'rechazar') nuevoEstado = 'rechazado'

    if (accion === 'cobrar') {
      // Generar movimiento de ingreso en caja
      const { data: { user } } = await supabase.auth.getUser()
      const { data: movimiento, error: movErr } = await supabase
        .from('movimientos_caja')
        .insert({
          fecha: todayString(),
          tipo: 'ingreso',
          concepto: `Cobro cheque Nº ${cheque.numero} — ${cheque.banco ?? ''}`,
          monto: cheque.monto,
          medio_pago: 'cheque_tercero',
          cliente_id: cheque.cliente_id,
          cheque_id: cheque.id,
          notas: nota || null,
          usuario_id: user?.id,
        })
        .select('id')
        .single()

      if (movErr) { toast.error('Error al generar el movimiento en caja'); setLoading(false); return }

      await supabase.from('cheques').update({
        estado: 'cobrado',
        movimiento_caja_id: movimiento.id,
        notas: nota ? `${cheque.notas ?? ''}\nCobrado: ${nota}` : cheque.notas,
      }).eq('id', cheque.id)

      toast.success(`Cheque cobrado y movimiento de caja generado: ${formatMonto(cheque.monto)}`)
    } else {
      await supabase.from('cheques').update({
        estado: nuevoEstado,
        endosado_a: accion === 'endosar' ? nota : undefined,
        notas: nota ? `${cheque.notas ?? ''}\n${nota}` : cheque.notas,
      }).eq('id', cheque.id)

      toast.success(`Cheque marcado como ${ESTADO_LABELS[nuevoEstado]}`)
    }

    onSaved(); onClose()
  }

  const titles = { cobrar: '✅ Cobrar cheque', endosar: '↗ Endosar cheque', rechazar: '❌ Marcar como rechazado' }
  const placeholders = { cobrar: 'Notas del cobro...', endosar: 'A quién se endosa...', rechazar: 'Motivo del rechazo...' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">{titles[accion]}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 8, marginBottom: '1rem', fontSize: '0.875rem' }}>
            <div><strong>Cheque Nº {cheque.numero}</strong> — {cheque.banco}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>{cheque.titular} · Fecha cobro: {formatDate(cheque.fecha_cobro)}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 800, marginTop: 4 }}>{formatMonto(cheque.monto)}</div>
          </div>
          {accion === 'cobrar' && (
            <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
              Se generará automáticamente un ingreso en la caja de hoy por {formatMonto(cheque.monto)}.
            </div>
          )}
          <label className="form-label" htmlFor="accion-nota">
            {accion === 'endosar' ? 'A quién se endosa *' : 'Notas'}
          </label>
          <input
            id="accion-nota"
            type="text"
            className="form-input"
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder={placeholders[accion]}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            className={`btn ${accion === 'rechazar' ? 'btn-danger' : 'btn-accent'}`}
            onClick={handleAction}
            disabled={loading}
          >
            {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
            Confirmar
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function ChequeCard({
  cheque,
  onEdit,
  onAccion,
  onDelete,
}: {
  cheque: ChequeConCliente
  onEdit: () => void
  onAccion: (accion: 'cobrar' | 'endosar' | 'rechazar') => void
  onDelete: () => void
}) {
  const today = todayString()
  const proxVencer = cheque.fecha_cobro && cheque.fecha_cobro <= addDays(new Date(), 3).toISOString().split('T')[0] && cheque.fecha_cobro >= today
  const vencido = cheque.fecha_cobro && cheque.fecha_cobro < today && cheque.estado === 'en_cartera'

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 10,
        padding: '0.875rem',
        border: `1px solid ${vencido ? 'var(--color-danger)' : proxVencer ? 'var(--color-warning)' : 'var(--color-border)'}`,
        boxShadow: vencido ? '0 0 0 2px rgba(239,68,68,0.1)' : proxVencer ? '0 0 0 2px rgba(245,158,11,0.1)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>Nº {cheque.numero}</div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{formatMonto(cheque.monto)}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {vencido && <span title="Vencido" style={{ fontSize: '0.875rem' }}>⚠️</span>}
          {proxVencer && !vencido && <span title="Próximo a vencer" style={{ fontSize: '0.875rem' }}>🔔</span>}
        </div>
      </div>

      <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
        {cheque.banco && <div>{cheque.banco}</div>}
        {cheque.titular && <div>{cheque.titular}</div>}
        {cheque.clientes && <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{(cheque.clientes as any).nombre}</div>}
        {cheque.fecha_cobro && (
          <div style={{ marginTop: 2, color: vencido ? 'var(--color-danger)' : proxVencer ? 'var(--color-warning)' : 'inherit', fontWeight: (vencido || proxVencer) ? 600 : 400 }}>
            Cobro: {formatDate(cheque.fecha_cobro)}
          </div>
        )}
      </div>

      {cheque.estado === 'en_cartera' && (
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginTop: '0.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
          <button className="btn btn-accent btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => onAccion('cobrar')}>
            <CheckCircle size={12} /> Cobrar
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => onAccion('endosar')}>
            <ArrowRight size={12} /> Endosar
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--color-danger)' }} onClick={() => onAccion('rechazar')}>
            <X size={12} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.25rem', marginTop: cheque.estado === 'en_cartera' ? '0.25rem' : '0.5rem' }}>
        <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: '0.75rem' }} onClick={onEdit}>
          <Edit2 size={12} /> Editar
        </button>
        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: '0.75rem' }} onClick={onDelete}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ChequesPage() {
  const supabase = createClient()
  const [cheques, setCheques] = useState<ChequeConCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; cheque?: ChequeConCliente }>({ open: false })
  const [accionModal, setAccionModal] = useState<{ open: boolean; cheque?: ChequeConCliente; accion?: 'cobrar' | 'endosar' | 'rechazar' }>({ open: false })

  const fetchData = async () => {
    setLoading(true)
    const [{ data: chs }, { data: cls }] = await Promise.all([
      supabase.from('cheques').select('*, clientes(nombre)').order('fecha_cobro', { ascending: true, nullsFirst: false }),
      supabase.from('clientes').select('*').order('nombre'),
    ])
    setCheques((chs as ChequeConCliente[]) ?? [])
    setClientes(cls ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (c: ChequeConCliente) => {
    if (!confirm(`¿Eliminar cheque Nº ${c.numero}?`)) return
    const { error } = await supabase.from('cheques').delete().eq('id', c.id)
    if (error) toast.error('Error al eliminar'); else { toast.success('Cheque eliminado'); fetchData() }
  }

  const chequesVencidos = cheques.filter(c => c.estado === 'en_cartera' && c.fecha_cobro && c.fecha_cobro < todayString())
  const chequesPorEstado = ESTADOS.reduce((acc, e) => {
    acc[e] = cheques.filter(c => c.estado === e)
    return acc
  }, {} as Record<ChequeEstado, ChequeConCliente[]>)

  const COL_COLORS: Record<ChequeEstado, { header: string; body: string }> = {
    en_cartera: { header: '#e0f2fe', body: '#f0f9ff' },
    cobrado: { header: '#d1fae5', body: '#f0fdf4' },
    rechazado: { header: '#fee2e2', body: '#fef2f2' },
    endosado: { header: '#ede9fe', body: '#faf5ff' },
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Control de Cheques</h1>
        <button id="nuevo-cheque-btn" className="btn btn-accent" onClick={() => setModal({ open: true })}>
          <Plus size={16} /> Nuevo cheque
        </button>
      </div>

      {chequesVencidos.length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <div>
            <strong>{chequesVencidos.length} cheque{chequesVencidos.length > 1 ? 's' : ''} vencido{chequesVencidos.length > 1 ? 's' : ''} sin cobrar</strong> —
            {chequesVencidos.map(c => ` Nº ${c.numero} (${formatMonto(c.monto)})`).join(', ')}
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {ESTADOS.map(estado => (
            <div key={estado}>
              <div
                style={{
                  padding: '0.625rem 0.875rem',
                  borderRadius: '10px 10px 0 0',
                  background: COL_COLORS[estado].header,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                <span>{ESTADO_LABELS[estado]}</span>
                <span
                  style={{
                    background: 'rgba(0,0,0,0.1)',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                  }}
                >
                  {chequesPorEstado[estado].length}
                </span>
              </div>
              <div
                style={{
                  background: COL_COLORS[estado].body,
                  borderRadius: '0 0 10px 10px',
                  padding: '0.75rem',
                  minHeight: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.625rem',
                  border: '1px solid var(--color-border)',
                  borderTop: 'none',
                }}
              >
                {chequesPorEstado[estado].length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: '1rem 0' }}>
                    Sin cheques
                  </div>
                ) : (
                  chequesPorEstado[estado].map(c => (
                    <ChequeCard
                      key={c.id}
                      cheque={c}
                      onEdit={() => setModal({ open: true, cheque: c })}
                      onAccion={(accion) => setAccionModal({ open: true, cheque: c, accion })}
                      onDelete={() => handleDelete(c)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <ChequeModal cheque={modal.cheque} clientes={clientes} onClose={() => setModal({ open: false })} onSaved={fetchData} />
      )}
      {accionModal.open && accionModal.cheque && accionModal.accion && (
        <AccionModal
          cheque={accionModal.cheque}
          accion={accionModal.accion}
          onClose={() => setAccionModal({ open: false })}
          onSaved={fetchData}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
