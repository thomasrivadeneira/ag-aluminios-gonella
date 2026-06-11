-- ============================================================
-- SEED DATA — AG Aluminios Gonella
-- ============================================================

-- Categorías de egreso iniciales
INSERT INTO categorias_egreso (id, nombre, descripcion) VALUES
  (uuid_generate_v4(), 'Materiales', 'Compra de aluminio, vidrio, herrajes y materiales de obra'),
  (uuid_generate_v4(), 'Mano de obra', 'Pago a empleados y contratistas'),
  (uuid_generate_v4(), 'Herramientas', 'Compra o reparación de herramientas y equipos'),
  (uuid_generate_v4(), 'Gastos fijos', 'Alquiler, servicios, seguros y gastos fijos mensuales'),
  (uuid_generate_v4(), 'Impuestos', 'Pagos impositivos, monotributo, IIBB y otros'),
  (uuid_generate_v4(), 'Fletes', 'Transporte, envíos y logística'),
  (uuid_generate_v4(), 'Varios', 'Gastos varios no clasificados');

-- ============================================================
-- NOTA: Para crear el usuario admin, hacerlo desde Supabase Dashboard:
-- 1. Ir a Authentication > Users > Invite User
-- 2. Email: admin@aluminiosgonella.com  Password: Admin1234!
-- 3. Luego ejecutar este INSERT con el UUID obtenido:
--
-- INSERT INTO usuarios_app (id, nombre, rol) VALUES
--   ('<UUID-del-usuario>', 'Administrador', 'admin');
--
-- O usar el trigger de abajo para hacerlo automáticamente.
-- ============================================================

-- Trigger: cuando se crea un usuario en auth, insertar en usuarios_app como operador
-- (El primer admin debe setearse manualmente)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios_app (id, nombre, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'rol')::usuario_rol, 'operador')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
