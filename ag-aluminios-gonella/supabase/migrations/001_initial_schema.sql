-- ============================================================
-- AG ALUMINIOS GONELLA — Schema completo con RLS
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CATEGORIAS DE EGRESO (sin FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias_egreso (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CLIENTES
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(200),
  cuit_dni VARCHAR(30),
  direccion TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_nombre ON clientes (nombre);
CREATE INDEX idx_clientes_cuit_dni ON clientes (cuit_dni);

-- ============================================================
-- 3. TRABAJOS
-- ============================================================
CREATE TYPE trabajo_estado AS ENUM ('presupuestado', 'en_ejecucion', 'terminado', 'cobrado');

CREATE TABLE IF NOT EXISTS trabajos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  descripcion TEXT NOT NULL,
  monto_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  estado trabajo_estado NOT NULL DEFAULT 'presupuestado',
  fecha_inicio DATE,
  fecha_estimada_entrega DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trabajos_cliente_id ON trabajos (cliente_id);
CREATE INDEX idx_trabajos_estado ON trabajos (estado);

-- Tabla historial de cambios de estado
CREATE TABLE IF NOT EXISTS trabajo_estado_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trabajo_id UUID NOT NULL REFERENCES trabajos(id) ON DELETE CASCADE,
  estado_anterior trabajo_estado,
  estado_nuevo trabajo_estado NOT NULL,
  notas TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_historial_trabajo_id ON trabajo_estado_historial (trabajo_id);

-- ============================================================
-- 4. CHEQUES
-- ============================================================
CREATE TYPE cheque_tipo AS ENUM ('tercero');
CREATE TYPE cheque_estado AS ENUM ('en_cartera', 'cobrado', 'rechazado', 'endosado');

CREATE TABLE IF NOT EXISTS cheques (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo cheque_tipo NOT NULL DEFAULT 'tercero',
  numero VARCHAR(50) NOT NULL,
  banco VARCHAR(100),
  titular VARCHAR(200),
  monto NUMERIC(14, 2) NOT NULL,
  fecha_emision DATE,
  fecha_cobro DATE,
  estado cheque_estado NOT NULL DEFAULT 'en_cartera',
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  movimiento_caja_id UUID,
  endosado_a TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cheques_estado ON cheques (estado);
CREATE INDEX idx_cheques_fecha_cobro ON cheques (fecha_cobro);
CREATE INDEX idx_cheques_cliente_id ON cheques (cliente_id);

-- ============================================================
-- 5. MOVIMIENTOS DE CAJA
-- ============================================================
CREATE TYPE movimiento_tipo AS ENUM ('ingreso', 'egreso');
CREATE TYPE medio_pago AS ENUM ('efectivo', 'transferencia', 'cheque_tercero', 'cheque_propio', 'debito', 'credito');

CREATE TABLE IF NOT EXISTS movimientos_caja (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo movimiento_tipo NOT NULL,
  concepto VARCHAR(300) NOT NULL,
  categoria_id UUID REFERENCES categorias_egreso(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  trabajo_id UUID REFERENCES trabajos(id) ON DELETE SET NULL,
  monto NUMERIC(14, 2) NOT NULL,
  medio_pago medio_pago NOT NULL DEFAULT 'efectivo',
  es_senia BOOLEAN NOT NULL DEFAULT FALSE,
  cheque_id UUID REFERENCES cheques(id) ON DELETE SET NULL,
  notas TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_movimientos_fecha ON movimientos_caja (fecha);
CREATE INDEX idx_movimientos_tipo ON movimientos_caja (tipo);
CREATE INDEX idx_movimientos_cliente_id ON movimientos_caja (cliente_id);
CREATE INDEX idx_movimientos_trabajo_id ON movimientos_caja (trabajo_id);
CREATE INDEX idx_movimientos_cheque_id ON movimientos_caja (cheque_id);

-- FK circular cheques -> movimientos_caja
ALTER TABLE cheques ADD CONSTRAINT fk_cheque_movimiento
  FOREIGN KEY (movimiento_caja_id) REFERENCES movimientos_caja(id) ON DELETE SET NULL;

-- ============================================================
-- 6. ARQUEOS
-- ============================================================
CREATE TABLE IF NOT EXISTS arqueos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL,
  efectivo NUMERIC(14, 2) NOT NULL DEFAULT 0,
  transferencias NUMERIC(14, 2) NOT NULL DEFAULT 0,
  cheques NUMERIC(14, 2) NOT NULL DEFAULT 0,
  otros NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_ingresos NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_egresos NUMERIC(14, 2) NOT NULL DEFAULT 0,
  saldo_dia NUMERIC(14, 2) NOT NULL DEFAULT 0,
  observaciones TEXT,
  usuario_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_arqueos_fecha ON arqueos (fecha);

-- ============================================================
-- 7. CONFIGURACION APP
-- ============================================================
CREATE TABLE IF NOT EXISTS configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  descripcion TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('fecha_inicio_operaciones', CURRENT_DATE::TEXT, 'Fecha desde la cual se calcula el saldo acumulado de caja');

-- ============================================================
-- 8. USUARIOS APP
-- ============================================================
CREATE TYPE usuario_rol AS ENUM ('admin', 'operador');

CREATE TABLE IF NOT EXISTS usuarios_app (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  rol usuario_rol NOT NULL DEFAULT 'operador',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trabajos_updated_at
  BEFORE UPDATE ON trabajos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_movimientos_updated_at
  BEFORE UPDATE ON movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_cheques_updated_at
  BEFORE UPDATE ON cheques
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: auto-cobrar trabajo cuando saldo = 0
-- ============================================================
CREATE OR REPLACE FUNCTION check_trabajo_cobrado()
RETURNS TRIGGER AS $$
DECLARE
  v_monto_total NUMERIC;
  v_total_cobrado NUMERIC;
  v_trabajo_id UUID;
BEGIN
  -- Determinar el trabajo_id del movimiento afectado
  IF TG_OP = 'DELETE' THEN
    v_trabajo_id := OLD.trabajo_id;
  ELSE
    v_trabajo_id := NEW.trabajo_id;
  END IF;

  IF v_trabajo_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT monto_total INTO v_monto_total
  FROM trabajos WHERE id = v_trabajo_id;

  SELECT COALESCE(SUM(monto), 0) INTO v_total_cobrado
  FROM movimientos_caja
  WHERE trabajo_id = v_trabajo_id AND tipo = 'ingreso';

  IF v_total_cobrado >= v_monto_total AND v_monto_total > 0 THEN
    UPDATE trabajos SET estado = 'cobrado' WHERE id = v_trabajo_id AND estado != 'cobrado';
  ELSE
    -- Si se revierte un pago y ya estaba cobrado, volver a terminado
    UPDATE trabajos SET estado = 'terminado' WHERE id = v_trabajo_id AND estado = 'cobrado';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_cobrado_insert
  AFTER INSERT ON movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION check_trabajo_cobrado();

CREATE TRIGGER trigger_check_cobrado_delete
  AFTER DELETE ON movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION check_trabajo_cobrado();

-- ============================================================
-- RLS — Row Level Security
-- ============================================================
ALTER TABLE categorias_egreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trabajo_estado_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE cheques ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE arqueos ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_app ENABLE ROW LEVEL SECURITY;

-- Helper function: obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_rol()
RETURNS usuario_rol AS $$
  SELECT rol FROM usuarios_app WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- POLICIES — Categorias Egreso
-- ============================================================
CREATE POLICY "categorias_select_all" ON categorias_egreso
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "categorias_admin_all" ON categorias_egreso
  FOR ALL TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Clientes
-- ============================================================
CREATE POLICY "clientes_select_all" ON clientes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "clientes_insert_auth" ON clientes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clientes_update_auth" ON clientes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "clientes_delete_admin" ON clientes
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Trabajos
-- ============================================================
CREATE POLICY "trabajos_select_all" ON trabajos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "trabajos_insert_auth" ON trabajos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "trabajos_update_auth" ON trabajos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "trabajos_delete_admin" ON trabajos
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Historial
-- ============================================================
CREATE POLICY "historial_select_all" ON trabajo_estado_historial
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "historial_insert_auth" ON trabajo_estado_historial
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "historial_delete_admin" ON trabajo_estado_historial
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Cheques
-- ============================================================
CREATE POLICY "cheques_select_all" ON cheques
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cheques_insert_auth" ON cheques
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cheques_update_auth" ON cheques
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "cheques_delete_admin" ON cheques
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Movimientos Caja
-- ============================================================
CREATE POLICY "movimientos_select_all" ON movimientos_caja
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "movimientos_insert_auth" ON movimientos_caja
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "movimientos_update_auth" ON movimientos_caja
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "movimientos_delete_admin" ON movimientos_caja
  FOR DELETE TO authenticated USING (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Arqueos (solo admin)
-- ============================================================
CREATE POLICY "arqueos_admin_all" ON arqueos
  FOR ALL TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Configuracion
-- ============================================================
CREATE POLICY "config_select_all" ON configuracion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "config_admin_all" ON configuracion
  FOR ALL TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- ============================================================
-- POLICIES — Usuarios App
-- ============================================================
CREATE POLICY "usuarios_select_own" ON usuarios_app
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios_admin_all" ON usuarios_app
  FOR ALL TO authenticated
  USING (get_user_rol() = 'admin')
  WITH CHECK (get_user_rol() = 'admin');

-- Permitir insert al registrarse (sin rol aún)
CREATE POLICY "usuarios_insert_own" ON usuarios_app
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
