export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categorias_egreso: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          created_at?: string
        }
      }
      clientes: {
        Row: {
          id: string
          nombre: string
          telefono: string | null
          email: string | null
          cuit_dni: string | null
          direccion: string | null
          notas: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          telefono?: string | null
          email?: string | null
          cuit_dni?: string | null
          direccion?: string | null
          notas?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          telefono?: string | null
          email?: string | null
          cuit_dni?: string | null
          direccion?: string | null
          notas?: string | null
          created_at?: string
        }
      }
      trabajos: {
        Row: {
          id: string
          cliente_id: string
          descripcion: string
          monto_total: number
          estado: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          fecha_inicio: string | null
          fecha_estimada_entrega: string | null
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          descripcion: string
          monto_total?: number
          estado?: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          fecha_inicio?: string | null
          fecha_estimada_entrega?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          descripcion?: string
          monto_total?: number
          estado?: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          fecha_inicio?: string | null
          fecha_estimada_entrega?: string | null
          observaciones?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      trabajo_estado_historial: {
        Row: {
          id: string
          trabajo_id: string
          estado_anterior: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado' | null
          estado_nuevo: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          notas: string | null
          usuario_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          trabajo_id: string
          estado_anterior?: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado' | null
          estado_nuevo: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          notas?: string | null
          usuario_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          trabajo_id?: string
          estado_anterior?: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado' | null
          estado_nuevo?: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
          notas?: string | null
          usuario_id?: string | null
          created_at?: string
        }
      }
      cheques: {
        Row: {
          id: string
          tipo: 'tercero'
          numero: string
          banco: string | null
          titular: string | null
          monto: number
          fecha_emision: string | null
          fecha_cobro: string | null
          estado: 'en_cartera' | 'cobrado' | 'rechazado' | 'endosado'
          cliente_id: string | null
          movimiento_caja_id: string | null
          endosado_a: string | null
          notas: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo?: 'tercero'
          numero: string
          banco?: string | null
          titular?: string | null
          monto: number
          fecha_emision?: string | null
          fecha_cobro?: string | null
          estado?: 'en_cartera' | 'cobrado' | 'rechazado' | 'endosado'
          cliente_id?: string | null
          movimiento_caja_id?: string | null
          endosado_a?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tipo?: 'tercero'
          numero?: string
          banco?: string | null
          titular?: string | null
          monto?: number
          fecha_emision?: string | null
          fecha_cobro?: string | null
          estado?: 'en_cartera' | 'cobrado' | 'rechazado' | 'endosado'
          cliente_id?: string | null
          movimiento_caja_id?: string | null
          endosado_a?: string | null
          notas?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      movimientos_caja: {
        Row: {
          id: string
          fecha: string
          tipo: 'ingreso' | 'egreso'
          concepto: string
          categoria_id: string | null
          cliente_id: string | null
          trabajo_id: string | null
          monto: number
          medio_pago: 'efectivo' | 'transferencia' | 'cheque_tercero' | 'cheque_propio' | 'debito' | 'credito'
          es_senia: boolean
          cheque_id: string | null
          notas: string | null
          usuario_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha?: string
          tipo: 'ingreso' | 'egreso'
          concepto: string
          categoria_id?: string | null
          cliente_id?: string | null
          trabajo_id?: string | null
          monto: number
          medio_pago?: 'efectivo' | 'transferencia' | 'cheque_tercero' | 'cheque_propio' | 'debito' | 'credito'
          es_senia?: boolean
          cheque_id?: string | null
          notas?: string | null
          usuario_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          tipo?: 'ingreso' | 'egreso'
          concepto?: string
          categoria_id?: string | null
          cliente_id?: string | null
          trabajo_id?: string | null
          monto?: number
          medio_pago?: 'efectivo' | 'transferencia' | 'cheque_tercero' | 'cheque_propio' | 'debito' | 'credito'
          es_senia?: boolean
          cheque_id?: string | null
          notas?: string | null
          usuario_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      arqueos: {
        Row: {
          id: string
          fecha: string
          efectivo: number
          transferencias: number
          cheques: number
          otros: number
          total_ingresos: number
          total_egresos: number
          saldo_dia: number
          observaciones: string | null
          usuario_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          fecha: string
          efectivo?: number
          transferencias?: number
          cheques?: number
          otros?: number
          total_ingresos?: number
          total_egresos?: number
          saldo_dia?: number
          observaciones?: string | null
          usuario_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          fecha?: string
          efectivo?: number
          transferencias?: number
          cheques?: number
          otros?: number
          total_ingresos?: number
          total_egresos?: number
          saldo_dia?: number
          observaciones?: string | null
          usuario_id?: string | null
          created_at?: string
        }
      }
      configuracion: {
        Row: {
          id: string
          clave: string
          valor: string | null
          descripcion: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          clave: string
          valor?: string | null
          descripcion?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          clave?: string
          valor?: string | null
          descripcion?: string | null
          updated_at?: string
        }
      }
      usuarios_app: {
        Row: {
          id: string
          nombre: string
          rol: 'admin' | 'operador'
          activo: boolean
          created_at: string
        }
        Insert: {
          id: string
          nombre: string
          rol?: 'admin' | 'operador'
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          rol?: 'admin' | 'operador'
          activo?: boolean
          created_at?: string
        }
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_user_rol: {
        Args: Record<PropertyKey, never>
        Returns: 'admin' | 'operador'
      }
    }
    Enums: {
      trabajo_estado: 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'
      cheque_estado: 'en_cartera' | 'cobrado' | 'rechazado' | 'endosado'
      movimiento_tipo: 'ingreso' | 'egreso'
      medio_pago: 'efectivo' | 'transferencia' | 'cheque_tercero' | 'cheque_propio' | 'debito' | 'credito'
      usuario_rol: 'admin' | 'operador'
    }
  }
}

// Convenience types
export type Cliente = Database['public']['Tables']['clientes']['Row']
export type ClienteInsert = Database['public']['Tables']['clientes']['Insert']

export type Trabajo = Database['public']['Tables']['trabajos']['Row']
export type TrabajoInsert = Database['public']['Tables']['trabajos']['Insert']
export type TrabajoEstado = 'presupuestado' | 'en_ejecucion' | 'terminado' | 'cobrado'

export type Cheque = Database['public']['Tables']['cheques']['Row']
export type ChequeInsert = Database['public']['Tables']['cheques']['Insert']
export type ChequeEstado = 'en_cartera' | 'cobrado' | 'rechazado' | 'endosado'

export type MovimientoCaja = Database['public']['Tables']['movimientos_caja']['Row']
export type MovimientoCajaInsert = Database['public']['Tables']['movimientos_caja']['Insert']
export type MovimientoTipo = 'ingreso' | 'egreso'
export type MedioPago = 'efectivo' | 'transferencia' | 'cheque_tercero' | 'cheque_propio' | 'debito' | 'credito'

export type Arqueo = Database['public']['Tables']['arqueos']['Row']
export type ArqueoInsert = Database['public']['Tables']['arqueos']['Insert']

export type CategoriaEgreso = Database['public']['Tables']['categorias_egreso']['Row']
export type CategoriaEgresoInsert = Database['public']['Tables']['categorias_egreso']['Insert']

export type UsuarioApp = Database['public']['Tables']['usuarios_app']['Row']
export type UsuarioRol = 'admin' | 'operador'

// Extended types with joins
export type TrabajoConCliente = Trabajo & { clientes: Pick<Cliente, 'id' | 'nombre'> }
export type MovimientoConRelaciones = MovimientoCaja & {
  clientes?: Pick<Cliente, 'id' | 'nombre'> | null
  trabajos?: Pick<Trabajo, 'id' | 'descripcion'> | null
  categorias_egreso?: Pick<CategoriaEgreso, 'id' | 'nombre'> | null
  cheques?: Pick<Cheque, 'id' | 'numero' | 'banco'> | null
}
export type ChequeConCliente = Cheque & { clientes?: Pick<Cliente, 'id' | 'nombre'> | null }
