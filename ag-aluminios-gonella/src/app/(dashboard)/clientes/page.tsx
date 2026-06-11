'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Edit2, Trash2, Phone, Mail, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate } from '@/lib/format'
import type { Cliente } from '@/types/database'

// ─── Form Modal ────────────────────────────────────────────────────────────────
function ClienteModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente?: Cliente
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: cliente?.nombre ?? '',
    telefono: cliente?.telefono ?? '',
    email: cliente?.email ?? '',
    cuit_dni: cliente?.cuit_dni ?? '',
    direccion: cliente?.direccion ?? '',
    notas: cliente?.notas ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)

    if (cliente) {
      const { error } = await supabase.from('clientes').update(form).eq('id', cliente.id)
      if (error) { toast.error('Error al actualizar el cliente'); setLoading(false); return }
      toast.success('Cliente actualizado correctamente')
    } else {
      const { error } = await supabase.from('clientes').insert(form)
      if (error) { toast.error('Error al crear el cliente'); setLoading(false); return }
      toast.success('Cliente creado correctamente')
    }
    onSaved()
    onClose()
  }

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; required?: boolean; placeholder?: string; textarea?: boolean }
  ) => (
    <div key={key}>
      <label className="form-label" htmlFor={`field-${key}`}>
        {label} {opts?.required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
      </label>
      {opts?.textarea ? (
        <textarea
          id={`field-${key}`}
          className="form-input"
          rows={3}
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={opts.placeholder}
          style={{ resize: 'vertical' }}
        />
      ) : (
        <input
          id={`field-${key}`}
          type={opts?.type ?? 'text'}
          className="form-input"
          value={form[key]}
          onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
          placeholder={opts?.placeholder}
          required={opts?.required}
        />
      )}
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{cliente ? 'Editar cliente' : 'Nuevo cliente'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {field('Nombre', 'nombre', { required: true, placeholder: 'Razón social o nombre completo' })}
          <div className="grid-2">
            {field('Teléfono', 'telefono', { type: 'tel', placeholder: '11 1234-5678' })}
            {field('Email', 'email', { type: 'email', placeholder: 'cliente@email.com' })}
          </div>
          <div className="grid-2">
            {field('CUIT / DNI', 'cuit_dni', { placeholder: '20-12345678-9' })}
            {field('Dirección', 'direccion', { placeholder: 'Calle 123, Ciudad' })}
          </div>
          {field('Notas internas', 'notas', { textarea: true, placeholder: 'Observaciones sobre el cliente...' })}
          <div className="drawer-footer" style={{ padding: 0, paddingTop: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              {cliente ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function ClientesPage() {
  const supabase = createClient()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; cliente?: Cliente }>({ open: false })
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchClientes = async () => {
    setLoading(true)
    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('nombre')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (search.trim()) {
      query = query.or(`nombre.ilike.%${search}%,cuit_dni.ilike.%${search}%`)
    }

    const { data, count, error } = await query
    if (!error) {
      setClientes(data ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [page, search])

  const handleDelete = async (cliente: Cliente) => {
    // Verificar trabajos asociados
    const { count: trabajosCount } = await supabase
      .from('trabajos')
      .select('*', { count: 'exact', head: true })
      .eq('cliente_id', cliente.id)

    if (trabajosCount && trabajosCount > 0) {
      // Verificar saldo pendiente
      const { data: trabajos } = await supabase
        .from('trabajos')
        .select('id, monto_total, estado')
        .eq('cliente_id', cliente.id)
        .neq('estado', 'cobrado')

      if (trabajos && trabajos.length > 0) {
        toast.error(`No se puede eliminar: ${cliente.nombre} tiene trabajos con saldo pendiente`)
        return
      }
    }

    if (!confirm(`¿Eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`)) return

    setDeleting(cliente.id)
    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      toast.error('Error al eliminar el cliente')
    } else {
      toast.success('Cliente eliminado')
      fetchClientes()
    }
    setDeleting(null)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <button
          id="nuevo-cliente-btn"
          className="btn btn-accent"
          onClick={() => setModal({ open: true })}
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
        <div className="search-wrapper">
          <Search size={15} className="search-icon" />
          <input
            id="search-clientes"
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o CUIT..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
          />
        </div>
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {total} clientes
        </span>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>CUIT / DNI</th>
              <th>Teléfono</th>
              <th>Email</th>
              <th>Desde</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                  <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                </td>
              </tr>
            ) : clientes.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><FileText size={40} /></div>
                    <div className="empty-state-title">No hay clientes</div>
                    <div className="empty-state-desc">
                      {search ? 'Sin resultados para la búsqueda.' : 'Creá el primer cliente con el botón de arriba.'}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              clientes.map(c => (
                <tr key={c.id}>
                  <td>
                    <a href={`/clientes/${c.id}`} style={{ fontWeight: 600, color: 'var(--color-text)', textDecoration: 'none' }}>
                      {c.nombre}
                    </a>
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                    {c.cuit_dni || '—'}
                  </td>
                  <td>
                    {c.telefono ? (
                      <a href={`tel:${c.telefono}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        <Phone size={13} /> {c.telefono}
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    {c.email ? (
                      <a href={`mailto:${c.email}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.875rem' }}>
                        <Mail size={13} /> {c.email}
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                    {formatDate(c.created_at)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                      <a
                        href={`/clientes/${c.id}`}
                        className="btn btn-ghost btn-sm"
                        title="Ver detalle"
                      >
                        <FileText size={14} />
                      </a>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setModal({ open: true, cliente: c })}
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--color-danger)' }}
                        onClick={() => handleDelete(c)}
                        disabled={deleting === c.id}
                        title="Eliminar"
                      >
                        {deleting === c.id ? <Loader2 size={14} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span>Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}</span>
            <div className="pagination-pages">
              <button className="pagination-btn" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                <button
                  key={i}
                  className={`pagination-btn${page === i ? ' active' : ''}`}
                  onClick={() => setPage(i)}
                >{i + 1}</button>
              ))}
              <button className="pagination-btn" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>›</button>
            </div>
          </div>
        )}
      </div>

      {modal.open && (
        <ClienteModal
          cliente={modal.cliente}
          onClose={() => setModal({ open: false })}
          onSaved={fetchClientes}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
