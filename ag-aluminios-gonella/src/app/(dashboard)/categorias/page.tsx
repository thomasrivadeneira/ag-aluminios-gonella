'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { CategoriaEgreso } from '@/types/database'

function CategoriaModal({
  categoria,
  onClose,
  onSaved,
}: {
  categoria?: CategoriaEgreso
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: categoria?.nombre ?? '',
    descripcion: categoria?.descripcion ?? '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) return toast.error('El nombre es obligatorio')
    setLoading(true)

    if (categoria) {
      const { error } = await supabase.from('categorias_egreso').update(form).eq('id', categoria.id)
      if (error) { toast.error('Error al actualizar'); setLoading(false); return }
      toast.success('Categoría actualizada')
    } else {
      const { error } = await supabase.from('categorias_egreso').insert(form)
      if (error) { toast.error('Error al crear'); setLoading(false); return }
      toast.success('Categoría creada')
    }
    onSaved(); onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <h2 className="modal-title">{categoria ? 'Editar categoría' : 'Nueva categoría'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="form-label" htmlFor="cat-nombre">Nombre *</label>
            <input
              id="cat-nombre"
              type="text"
              className="form-input"
              value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej: Materiales, Mano de obra..."
              required
            />
          </div>
          <div>
            <label className="form-label" htmlFor="cat-desc">Descripción</label>
            <textarea
              id="cat-desc"
              className="form-input"
              rows={2}
              value={form.descripcion}
              onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Descripción opcional..."
              style={{ resize: 'vertical' }}
            />
          </div>
          <div className="drawer-footer" style={{ padding: 0, paddingTop: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-accent" disabled={loading}>
              {loading && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
              {categoria ? 'Guardar' : 'Crear categoría'}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export default function CategoriasPage() {
  const supabase = createClient()
  const [categorias, setCategorias] = useState<CategoriaEgreso[]>([])
  const [conteos, setConteos] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; categoria?: CategoriaEgreso }>({ open: false })

  const fetchData = async () => {
    setLoading(true)
    const { data: cats } = await supabase.from('categorias_egreso').select('*').order('nombre')

    // Contar movimientos por categoría
    const { data: counts } = await supabase
      .from('movimientos_caja')
      .select('categoria_id')
      .not('categoria_id', 'is', null)

    const cmap: Record<string, number> = {}
    counts?.forEach(c => { if (c.categoria_id) cmap[c.categoria_id] = (cmap[c.categoria_id] ?? 0) + 1 })

    setCategorias(cats ?? [])
    setConteos(cmap)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleDelete = async (c: CategoriaEgreso) => {
    if ((conteos[c.id] ?? 0) > 0) {
      toast.error(`No se puede eliminar: tiene ${conteos[c.id]} movimiento(s) asociado(s)`)
      return
    }
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return
    const { error } = await supabase.from('categorias_egreso').delete().eq('id', c.id)
    if (error) toast.error('Error al eliminar'); else { toast.success('Categoría eliminada'); fetchData() }
  }

  const ICONS: Record<string, string> = {
    'Materiales': '🔩',
    'Mano de obra': '👷',
    'Herramientas': '🔧',
    'Gastos fijos': '🏠',
    'Impuestos': '📋',
    'Fletes': '🚚',
    'Varios': '📦',
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categorías de Egreso</h1>
        <button id="nueva-categoria-btn" className="btn btn-accent" onClick={() => setModal({ open: true })}>
          <Plus size={16} /> Nueva categoría
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {categorias.map(c => (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{ICONS[c.nombre] ?? '📁'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{c.nombre}</div>
                    {c.descripcion && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{c.descripcion}</div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, categoria: c })}>
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--color-danger)' }}
                    onClick={() => handleDelete(c)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem' }}>
                {conteos[c.id] ?? 0} movimiento{(conteos[c.id] ?? 0) !== 1 ? 's' : ''} registrado{(conteos[c.id] ?? 0) !== 1 ? 's' : ''}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && (
        <CategoriaModal
          categoria={modal.categoria}
          onClose={() => setModal({ open: false })}
          onSaved={fetchData}
        />
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
