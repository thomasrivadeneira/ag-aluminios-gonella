'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Loader2, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatDate, formatMonto, todayString } from '@/lib/format'
import type { Arqueo } from '@/types/database'

interface ResumenDia {
  efectivo_in: number
  efectivo_out: number
  transferencias_in: number
  transferencias_out: number
  cheques_in: number
  cheques_out: number
  otros_in: number
  otros_out: number
  total_ingresos: number
  total_egresos: number
}

export default function ArqueoPage() {
  const supabase = createClient()
  const [fecha, setFecha] = useState(todayString())
  const [resumen, setResumen] = useState<ResumenDia | null>(null)
  const [arqueoExistente, setArqueoExistente] = useState<Arqueo | null>(null)
  const [historial, setHistorial] = useState<Arqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [userRol, setUserRol] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: ua } = await supabase.from('usuarios_app').select('rol').eq('id', user.id).single()
        setUserRol(ua?.rol ?? 'operador')
      }
    }
    init()
  }, [])

  const fetchData = async () => {
    setLoading(true)

    const [{ data: movs }, { data: arqueos }, { data: arqHist }] = await Promise.all([
      supabase.from('movimientos_caja').select('tipo, monto, medio_pago').eq('fecha', fecha),
      supabase.from('arqueos').select('*').eq('fecha', fecha).maybeSingle(),
      supabase.from('arqueos').select('*').order('fecha', { ascending: false }).limit(30),
    ])

    setArqueoExistente(arqueos ?? null)
    setHistorial(arqHist ?? [])

    if (movs) {
      const res: ResumenDia = {
        efectivo_in: 0, efectivo_out: 0,
        transferencias_in: 0, transferencias_out: 0,
        cheques_in: 0, cheques_out: 0,
        otros_in: 0, otros_out: 0,
        total_ingresos: 0, total_egresos: 0,
      }
      movs.forEach(m => {
        const isIn = m.tipo === 'ingreso'
        const monto = m.monto
        if (isIn) res.total_ingresos += monto; else res.total_egresos += monto

        if (m.medio_pago === 'efectivo') {
          if (isIn) res.efectivo_in += monto; else res.efectivo_out += monto
        } else if (m.medio_pago === 'transferencia') {
          if (isIn) res.transferencias_in += monto; else res.transferencias_out += monto
        } else if (m.medio_pago === 'cheque_tercero' || m.medio_pago === 'cheque_propio') {
          if (isIn) res.cheques_in += monto; else res.cheques_out += monto
        } else {
          if (isIn) res.otros_in += monto; else res.otros_out += monto
        }
      })
      setResumen(res)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [fecha])

  const handleCerrarCaja = async () => {
    if (!resumen) return
    if (!confirm(`¿Confirmar cierre de caja del ${formatDate(fecha)}? Esta acción no se puede deshacer.`)) return

    setCerrando(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('arqueos').upsert({
      fecha,
      efectivo: resumen.efectivo_in - resumen.efectivo_out,
      transferencias: resumen.transferencias_in - resumen.transferencias_out,
      cheques: resumen.cheques_in - resumen.cheques_out,
      otros: resumen.otros_in - resumen.otros_out,
      total_ingresos: resumen.total_ingresos,
      total_egresos: resumen.total_egresos,
      saldo_dia: resumen.total_ingresos - resumen.total_egresos,
      observaciones: observaciones || null,
      usuario_id: user?.id,
    }, { onConflict: 'fecha' })

    if (error) {
      toast.error('Error al cerrar la caja: ' + error.message)
    } else {
      toast.success('¡Caja cerrada correctamente!')
      setObservaciones('')
      fetchData()
    }
    setCerrando(false)
  }

  const saldoDia = resumen ? resumen.total_ingresos - resumen.total_egresos : 0

  const FilaResumen = ({ label, ing, egr }: { label: string; ing: number; egr: number }) => (
    <tr>
      <td style={{ fontWeight: 500 }}>{label}</td>
      <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(ing)}</td>
      <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatMonto(egr)}</td>
      <td style={{ textAlign: 'right', fontWeight: 700, color: (ing - egr) >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
        {formatMonto(ing - egr)}
      </td>
    </tr>
  )

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Arqueo de Caja</h1>
        <input
          type="date"
          className="form-input"
          value={fecha}
          onChange={e => setFecha(e.target.value)}
          style={{ width: 170 }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Resumen */}
          <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>
                Resumen del {formatDate(fecha)}
                {arqueoExistente && (
                  <span className="badge badge-cobrado" style={{ marginLeft: '0.5rem' }}>✓ Cerrado</span>
                )}
              </h2>

              <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Medio</th>
                      <th style={{ textAlign: 'right' }}>Ingresos</th>
                      <th style={{ textAlign: 'right' }}>Egresos</th>
                      <th style={{ textAlign: 'right' }}>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen && (
                      <>
                        <FilaResumen label="💵 Efectivo" ing={resumen.efectivo_in} egr={resumen.efectivo_out} />
                        <FilaResumen label="📲 Transferencias" ing={resumen.transferencias_in} egr={resumen.transferencias_out} />
                        <FilaResumen label="📋 Cheques" ing={resumen.cheques_in} egr={resumen.cheques_out} />
                        <FilaResumen label="💳 Otros" ing={resumen.otros_in} egr={resumen.otros_out} />
                        <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                          <td>TOTAL</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(resumen.total_ingresos)}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatMonto(resumen.total_egresos)}</td>
                          <td style={{ textAlign: 'right', fontSize: '1rem', color: saldoDia >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
                            {formatMonto(saldoDia)}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cierre */}
            {userRol === 'admin' && !arqueoExistente && (
              <div className="card">
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ClipboardCheck size={16} /> Cerrar caja del día
                </h2>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label" htmlFor="arqueo-obs">Observaciones del cierre</label>
                  <textarea
                    id="arqueo-obs"
                    className="form-input"
                    rows={2}
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Notas sobre el cierre de caja..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <button
                  id="btn-cerrar-caja"
                  className="btn btn-primary"
                  onClick={handleCerrarCaja}
                  disabled={cerrando}
                >
                  {cerrando && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                  <ClipboardCheck size={16} />
                  Cerrar caja del {formatDate(fecha)}
                </button>
              </div>
            )}

            {userRol !== 'admin' && (
              <div className="alert alert-info">
                <AlertTriangle size={16} />
                Solo los administradores pueden cerrar la caja.
              </div>
            )}

            {arqueoExistente && (
              <div className="alert alert-success">
                <ClipboardCheck size={16} />
                Caja cerrada el {formatDate(arqueoExistente.created_at)}.
                {arqueoExistente.observaciones && ` · ${arqueoExistente.observaciones}`}
              </div>
            )}
          </div>

          {/* Historial */}
          <div className="card">
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>Historial de cierres</h2>
            {historial.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <div className="empty-state-title">Sin cierres registrados</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historial.map(a => (
                  <div
                    key={a.id}
                    style={{
                      padding: '0.625rem 0.75rem',
                      borderRadius: 8,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                    }}
                    onClick={() => setFecha(a.fecha)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{formatDate(a.fecha)}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: a.saldo_dia >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
                        {formatMonto(a.saldo_dia)}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      Ing: {formatMonto(a.total_ingresos)} · Egr: {formatMonto(a.total_egresos)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
