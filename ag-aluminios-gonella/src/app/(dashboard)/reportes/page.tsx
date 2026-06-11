'use client'

import { useState, useEffect } from 'react'
import { Loader2, TrendingUp, TrendingDown, BarChart2, CreditCard, Users, Briefcase } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatMonto } from '@/lib/format'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { subDays, startOfWeek, startOfMonth } from 'date-fns'

type Rango = 'hoy' | 'semana' | 'mes' | 'personalizado'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

const MEDIO_LABELS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque_tercero: 'Cheque 3°',
  cheque_propio: 'Cheque propio',
  debito: 'Débito',
  credito: 'Crédito',
}

export default function ReportesPage() {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const [rango, setRango] = useState<Rango>('mes')
  const [desde, setDesde] = useState(startOfMonth(new Date()).toISOString().split('T')[0])
  const [hasta, setHasta] = useState(today)
  const [loading, setLoading] = useState(false)

  // Data
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [trabajos, setTrabajos] = useState<any[]>([])
  const [cheques, setCheques] = useState<any[]>([])
  const [userRol, setUserRol] = useState('')

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

  const aplicarRango = (r: Rango) => {
    setRango(r)
    const t = new Date()
    if (r === 'hoy') { setDesde(today); setHasta(today) }
    else if (r === 'semana') { setDesde(startOfWeek(t, { weekStartsOn: 1 }).toISOString().split('T')[0]); setHasta(today) }
    else if (r === 'mes') { setDesde(startOfMonth(t).toISOString().split('T')[0]); setHasta(today) }
  }

  const fetchData = async () => {
    setLoading(true)
    const [{ data: movs }, { data: trabs }, { data: chs }] = await Promise.all([
      supabase
        .from('movimientos_caja')
        .select('*, categorias_egreso(nombre), clientes(nombre)')
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase
        .from('trabajos')
        .select('*, clientes(nombre)')
        .order('monto_total', { ascending: false }),
      supabase
        .from('cheques')
        .select('*, clientes(nombre)'),
    ])
    setMovimientos(movs ?? [])
    setTrabajos(trabs ?? [])
    setCheques(chs ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [desde, hasta])

  if (userRol === 'operador') {
    return (
      <div>
        <h1 className="page-title">Reportes</h1>
        <div className="alert alert-danger" style={{ marginTop: '1rem' }}>
          No tenés permisos para ver los reportes. Contactá al administrador.
        </div>
      </div>
    )
  }

  const ingresos = movimientos.filter(m => m.tipo === 'ingreso')
  const egresos = movimientos.filter(m => m.tipo === 'egreso')
  const totalIngresos = ingresos.reduce((s, m) => s + m.monto, 0)
  const totalEgresos = egresos.reduce((s, m) => s + m.monto, 0)
  const resultadoNeto = totalIngresos - totalEgresos

  // Desglose por medio
  const desgloseMedio = Object.entries(MEDIO_LABELS).map(([key, label]) => ({
    label,
    ingresos: ingresos.filter(m => m.medio_pago === key).reduce((s, m) => s + m.monto, 0),
    egresos: egresos.filter(m => m.medio_pago === key).reduce((s, m) => s + m.monto, 0),
  })).filter(d => d.ingresos > 0 || d.egresos > 0)

  // Egresos por categoría (pie chart)
  const egresosCategoria = egresos.reduce((acc: Record<string, number>, m) => {
    const cat = m.categorias_egreso?.nombre ?? 'Sin categoría'
    acc[cat] = (acc[cat] ?? 0) + m.monto
    return acc
  }, {})
  const pieData = Object.entries(egresosCategoria)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
  const top5Categorias = pieData.slice(0, 5)

  // Cuenta corriente: trabajos activos
  const trabajosActivos = trabajos.filter(t => t.estado !== 'cobrado')
  const totalPendiente = trabajosActivos.reduce((s, t) => s + t.monto_total, 0)

  const trabajosVencidos = trabajosActivos.filter(t =>
    t.fecha_estimada_entrega && t.fecha_estimada_entrega < today && t.estado !== 'presupuestado'
  )

  // Cheques
  const enCartera = cheques.filter(c => c.estado === 'en_cartera')
  const totalEnCartera = enCartera.reduce((s, c) => s + c.monto, 0)
  const chequesProximos = enCartera.filter(c => {
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)
    return c.fecha_cobro && c.fecha_cobro <= nextWeek.toISOString().split('T')[0] && c.fecha_cobro >= today
  })
  const chequesVencidos = enCartera.filter(c => c.fecha_cobro && c.fecha_cobro < today)

  // Trabajos por estado
  const estadosCount = ['presupuestado', 'en_ejecucion', 'terminado', 'cobrado'].map(e => ({
    estado: e,
    label: { presupuestado: 'Presupuestado', en_ejecucion: 'En ejecución', terminado: 'Terminado', cobrado: 'Cobrado' }[e],
    cantidad: trabajos.filter(t => t.estado === e).length,
    monto: trabajos.filter(t => t.estado === e).reduce((s: number, t: any) => s + t.monto_total, 0),
  }))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
      </div>

      {/* Rango selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: 12, border: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Período:</span>
        {(['hoy', 'semana', 'mes'] as Rango[]).map(r => (
          <button key={r} className={`btn btn-sm ${rango === r ? 'btn-primary' : 'btn-ghost'}`} onClick={() => aplicarRango(r)}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
        <button className={`btn btn-sm ${rango === 'personalizado' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setRango('personalizado')}>
          Personalizado
        </button>
        {(rango === 'personalizado') && (
          <>
            <input type="date" className="form-input" style={{ width: 170 }} value={desde} onChange={e => setDesde(e.target.value)} />
            <span style={{ fontSize: '0.875rem' }}>a</span>
            <input type="date" className="form-input" style={{ width: 170 }} value={hasta} onChange={e => setHasta(e.target.value)} />
          </>
        )}
        <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          {formatDate(desde)} — {formatDate(hasta)}
        </span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Resumen financiero */}
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={16} /> Resumen financiero
            </h2>
            <div className="grid-3" style={{ marginBottom: '1rem' }}>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: '#d1fae5' }}><TrendingUp size={18} color="var(--color-accent-dark)" /></div>
                <div className="stat-card-label">Total ingresos</div>
                <div className="stat-card-value" style={{ color: 'var(--color-accent-dark)' }}>{formatMonto(totalIngresos)}</div>
                <div className="stat-card-sub">{ingresos.length} movimientos</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-icon" style={{ background: '#fee2e2' }}><TrendingDown size={18} color="var(--color-danger)" /></div>
                <div className="stat-card-label">Total egresos</div>
                <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{formatMonto(totalEgresos)}</div>
                <div className="stat-card-sub">{egresos.length} movimientos</div>
              </div>
              <div className="stat-card" style={{ borderLeft: `4px solid ${resultadoNeto >= 0 ? 'var(--color-accent)' : 'var(--color-danger)'}` }}>
                <div className="stat-card-label">Resultado neto</div>
                <div className="stat-card-value" style={{ color: resultadoNeto >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
                  {formatMonto(resultadoNeto)}
                </div>
              </div>
            </div>

            {/* Desglose por medio */}
            {desgloseMedio.length > 0 && (
              <div className="table-container">
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
                    {desgloseMedio.map(d => (
                      <tr key={d.label}>
                        <td style={{ fontWeight: 500 }}>{d.label}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-accent-dark)' }}>{formatMonto(d.ingresos)}</td>
                        <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatMonto(d.egresos)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: (d.ingresos - d.egresos) >= 0 ? 'var(--color-accent-dark)' : 'var(--color-danger)' }}>
                          {formatMonto(d.ingresos - d.egresos)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Egresos por categoría */}
          {pieData.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingDown size={16} /> Egresos por categoría
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="card" style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val) => formatMonto(Number(val))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card">
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem' }}>Top 5 categorías</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {top5Categorias.map((c, idx) => (
                      <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[idx], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: '0.875rem' }}>{c.name}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-danger)' }}>{formatMonto(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cheques */}
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard size={16} /> Cheques
            </h2>
            <div className="grid-3">
              <div className="stat-card">
                <div className="stat-card-label">En cartera</div>
                <div className="stat-card-value" style={{ color: 'var(--color-accent-dark)' }}>{formatMonto(totalEnCartera)}</div>
                <div className="stat-card-sub">{enCartera.length} cheques</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Próximos 7 días</div>
                <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>{formatMonto(chequesProximos.reduce((s, c) => s + c.monto, 0))}</div>
                <div className="stat-card-sub">{chequesProximos.length} cheques</div>
              </div>
              <div className="stat-card">
                <div className="stat-card-label">Vencidos sin cobrar</div>
                <div className="stat-card-value" style={{ color: 'var(--color-danger)' }}>{formatMonto(chequesVencidos.reduce((s, c) => s + c.monto, 0))}</div>
                <div className="stat-card-sub">{chequesVencidos.length} cheques</div>
              </div>
            </div>
          </section>

          {/* Trabajos */}
          <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Briefcase size={16} /> Trabajos por estado
            </h2>
            <div className="grid-4">
              {estadosCount.map(e => (
                <div key={e.estado} className="stat-card">
                  <div className="stat-card-label">{e.label}</div>
                  <div className="stat-card-value">{e.cantidad}</div>
                  <div className="stat-card-sub">{formatMonto(e.monto)}</div>
                </div>
              ))}
            </div>

            {trabajosVencidos.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-danger)' }}>
                  ⚠ Trabajos vencidos sin cobrar ({trabajosVencidos.length})
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Descripción</th>
                        <th>F. entrega</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trabajosVencidos.slice(0, 10).map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 500 }}>{t.clientes?.nombre}</td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{t.descripcion.substring(0, 50)}</td>
                          <td style={{ color: 'var(--color-danger)', fontWeight: 600 }}>{formatDate(t.fecha_estimada_entrega)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMonto(t.monto_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
