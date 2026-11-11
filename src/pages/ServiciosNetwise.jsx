import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Drawer, Field, Table } from "../components/ui";
import { getServiciosNetwise, guardarServicioNetwise, eliminarServicioNetwise } from "../api/serviciosNetwise";
import { useToast } from "../coomponents/Toast";
import { soles } from "../utils/formato";
import { UNIDADES_SERVICIO } from "../constants/netwise";
import styles from "./cuentas.module.scss";

const VACIO = { categoria: "", nombre: "", descripcion: "", unidad: "servicio", precio: "", activo: true };

export default function ServiciosNetwise() {
  const { show: showToast, ToastNode } = useToast();
  const [servicios, setServicios] = useState(null);
  const [verInactivos, setVerInactivos] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState("");

  const cargar = useCallback(
    () => getServiciosNetwise({ todos: true }).then(setServicios).catch(() => setServicios([])),
    [],
  );
  useEffect(() => { cargar(); }, [cargar]);

  const categorias = useMemo(
    () => [...new Set((servicios || []).map((s) => s.categoria))].sort(),
    [servicios],
  );

  const visibles = (servicios || []).filter((s) =>
    (verInactivos || s.activo) &&
    (!busqueda || `${s.nombre} ${s.categoria}`.toLowerCase().includes(busqueda.toLowerCase())),
  );

  const abrir = (s) => {
    setEditar(s);
    setForm(s.id ? { ...VACIO, ...s, descripcion: s.descripcion || "", precio: String(s.precio) } : VACIO);
    setErrorForm("");
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    setErrorForm("");
    try {
      const { categoria, nombre, descripcion, unidad, precio, activo } = form;
      const s = await guardarServicioNetwise({ id: editar?.id, categoria, nombre, descripcion, unidad, precio: Number(precio), activo });
      showToast(`Servicio ${s.nombre} guardado`, "success");
      setEditar(null);
      cargar();
    } catch (e) {
      setErrorForm(e.response?.data?.message ?? "No se pudo guardar el servicio");
    } finally {
      setGuardando(false);
    }
  };

  const desactivar = async (s) => {
    if (!confirm(`¿Desactivar "${s.nombre}"? Ya no aparecerá en el cotizador.`)) return;
    try {
      await eliminarServicioNetwise(s.id);
      cargar();
    } catch (e) {
      showToast(e.response?.data?.message ?? "No se pudo desactivar");
    }
  };

  const columnas = [
    { key: "nombre", label: "Servicio", render: (s) => (
      <div>
        <strong>{s.nombre}</strong>
        {s.descripcion && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", marginTop: "0.15rem" }}>{s.descripcion}</div>}
      </div>
    ) },
    { key: "categoria", label: "Categoría", render: (s) => <Badge tone="purple">{s.categoria}</Badge> },
    { key: "unidad", label: "Unidad", render: (s) => UNIDADES_SERVICIO[s.unidad] ?? s.unidad },
    { key: "precio", label: "Precio (sin IGV)", align: "right", render: (s) => soles(s.precio) },
    { key: "activo", label: "Estado", render: (s) => (s.activo ? <Badge tone="green">Activo</Badge> : <Badge tone="gray">Inactivo</Badge>) },
    { key: "acciones", label: "", align: "right", render: (s) => (
      <div style={{ display: "inline-flex", gap: "0.25rem" }}>
        <Button variant="ghost" size="sm" icon={Pencil} onClick={() => abrir(s)} aria-label={`Editar ${s.nombre}`} />
        {s.activo && <Button variant="ghost" size="sm" icon={Trash2} onClick={() => desactivar(s)} aria-label={`Desactivar ${s.nombre}`} />}
      </div>
    ) },
  ];

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Servicios Netwise</h2>
            <p className={styles.subtitle}>Catálogo de servicios y precios que se usan en el cotizador Netwise</p>
          </div>
          <div className={styles.acciones}>
            <Button icon={Plus} onClick={() => abrir({})}>Nuevo servicio</Button>
          </div>
        </div>

        {servicios === null ? (
          <p className={styles.sub}>Cargando servicios…</p>
        ) : servicios.length === 0 ? (
          <div className={styles.kpi} style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ margin: 0 }}><strong>Aún no hay servicios.</strong></p>
            <p className={styles.sub}>Crea los servicios de la agencia (redes sociales, web, campañas…) con su precio para cotizarlos.</p>
            <Button icon={Plus} onClick={() => abrir({})}>Crear el primer servicio</Button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div style={{ flex: "1 1 260px", maxWidth: 360 }}>
                <Field placeholder="Buscar servicio o categoría…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar servicio" />
              </div>
              <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "var(--text-sm)", color: "var(--color-text2)" }}>
                <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Ver inactivos
              </label>
            </div>
            <Table columns={columnas} rows={visibles} empty="Sin servicios para este filtro" />
          </>
        )}
      </div>

      <Drawer
        open={!!editar}
        onClose={() => setEditar(null)}
        eyebrow="Servicios Netwise"
        title={editar?.id ? `Editar ${editar.nombre}` : "Nuevo servicio"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando}
              disabled={!form.nombre.trim() || !form.categoria.trim() || form.precio === "" || Number(form.precio) < 0}>
              Guardar
            </Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Nombre" value={form.nombre} placeholder="Ej. Gestión de redes sociales" onChange={(e) => set("nombre", e.target.value)} required />
          <Field label="Categoría" value={form.categoria} placeholder="Ej. REDES SOCIALES, WEB, PUBLICIDAD" list="categorias-netwise"
            onChange={(e) => set("categoria", e.target.value)} required />
          <datalist id="categorias-netwise">
            {categorias.map((c) => <option key={c} value={c} />)}
          </datalist>
          <Field as="textarea" label="Descripción" rows={3} value={form.descripcion}
            hint="Aparece como detalle de la línea en la cotización" onChange={(e) => set("descripcion", e.target.value)} />
          <div className={styles.grid2}>
            <Field as="select" label="Unidad" value={form.unidad} onChange={(e) => set("unidad", e.target.value)}>
              {Object.entries(UNIDADES_SERVICIO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Field>
            <Field label="Precio (S/, sin IGV)" type="number" min="0" step="0.01" value={form.precio}
              onChange={(e) => set("precio", e.target.value)} required />
          </div>
          {editar?.id && (
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} /> Activo (se puede cotizar)
            </label>
          )}
          {errorForm && <div className={styles.error}>{errorForm}</div>}
        </div>
      </Drawer>
    </>
  );
}
