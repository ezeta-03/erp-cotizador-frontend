import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import { getModulosRol } from "../api/modulosRol";

// Caché compartida por toda la app: el menú, el Inicio y las rutas piden lo
// mismo, así que se trae una sola vez por sesión. Al guardar los toggles en
// Usuarios se llama a refrescarModulos() para que todo se actualice.
let cache = null;
let pendiente = null;
const suscriptores = new Set();

function cargar() {
  if (!pendiente) {
    pendiente = getModulosRol()
      .then((data) => { cache = data; suscriptores.forEach((fn) => fn(data)); return data; })
      .catch(() => null)
      .finally(() => { pendiente = null; });
  }
  return pendiente;
}

export function refrescarModulos(data) {
  if (data) {
    cache = data;
    suscriptores.forEach((fn) => fn(data));
    return;
  }
  cache = null;
  cargar();
}

// Devuelve { cargando, habilitados }, donde habilitados es un Set con los
// módulos del rol del usuario, o null si el rol no se configura (ADMIN,
// CLIENTE) o si no se pudo cargar — en ese caso no se oculta nada.
export default function useModulosHabilitados() {
  const { user } = useAuth() || {};
  const role = user?.role;
  const [data, setData] = useState(cache);

  useEffect(() => {
    suscriptores.add(setData);
    if (!cache) cargar();
    return () => { suscriptores.delete(setData); };
  }, []);

  const configurable = role === "VENTAS" || role === "CONTABLE";
  if (!configurable) return { cargando: false, habilitados: null };
  if (!data) return { cargando: true, habilitados: null };
  return { cargando: false, habilitados: new Set(data.habilitados?.[role] || []) };
}
