import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, RefreshCw, X, FileText, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getProveedores, createProveedor, updateProveedor, deleteProveedor, getAlertasPagos,
} from "../api/proveedores";
import FichaProveedorModal from "./FichaProveedorModal";
import styles from "./proveedores.module.scss";

const RELEVANCIA = ["ALTO", "MEDIO", "BAJO"];

const fmtDate = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const esVigente = (fin) => new Date(fin) >= new Date();

const FORM_VACIO = {
  nombre: "", ciudad: "", ubicacion: "", tipoContrato: "", elementos: "",
  inicio: "", fin: "", costoMensual: "", costoLuzMes: "",
  numeroCuenta: "", nombreCuenta: "", relevanciaComercial: "ALTO", razonSocial: "",
};

const fmtDMY = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Banner de alertas de pagos próximos ─────────────────────────────────── */
function AlertasBanner({ alertas }) {
  const [abierto, setAbierto] = useState(false);
  if (!alertas || alertas.length === 0) return null;

  return (
    <div className={styles.alertaBanner}>
      <button className={styles.alertaHeader} onClick={() => setAbierto((v) => !v)}>
        <span className={styles.alertaIcono}><AlertTriangle size={16} /></span>
        <span className={styles.alertaTexto}>
          {alertas.length === 1
            ? "1 pago vence esta semana"
            : `${alertas.length} pagos vencen esta semana`}
        </span>
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <ul className={styles.alertaLista}>
          {alertas.map((a) => (
            <li key={a.cuotaId} className={styles.alertaItem}>
              <span className={styles.alertaCodigo}>{a.proveedor.codigo}</span>
              <span className={styles.alertaUbic}>{a.proveedor.ubicacion}</span>
              <span className={styles.alertaMonto}>{fmtMoney(a.total)}</span>
              <span className={styles.alertaFecha}>{fmtDMY(a.fechaCobro)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Campo de formulario (debe estar fuera del componente para no recrearse) */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

/* ── Formulario ─────────────────────────────────────────────────────────── */
function ProveedorFormModal({ inicial, onSave, onCancel }) {
  const [form, setForm] = useState(inicial ?? FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.ubicacion || !form.tipoContrato || !form.inicio || !form.fin || !form.costoMensual) {
      setError("Nombre, ubicación, tipo, fechas y costo mensual son obligatorios.");
      return;
    }
    if (new Date(form.fin) <= new Date(form.inicio)) {
      setError("La fecha de fin debe ser posterior al inicio.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{inicial ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Nombre del proveedor">
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Blanca Vergara" />
          </F>

          <div className={styles.formRow}>
            <F label="Ciudad" optional>
              <input value={form.ciudad} onChange={set("ciudad")} placeholder="Ej. Huancayo" />
            </F>
            <F label="Relevancia comercial">
              <select value={form.relevanciaComercial} onChange={set("relevanciaComercial")}>
                {RELEVANCIA.map((r) => <option key={r}>{r}</option>)}
              </select>
            </F>
          </div>

          <F label="Ubicación / Propiedad">
            <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Ej. Pórtico Puente Giraldez" />
          </F>

          <div className={styles.formRow}>
            <F label="Tipo de contrato">
              <input value={form.tipoContrato} onChange={set("tipoContrato")} placeholder="Ej. Alquiler Estructura" />
            </F>
            <F label="Elementos" optional>
              <input value={form.elementos} onChange={set("elementos")} placeholder="Ej. Torre 10m x 5m" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Inicio del contrato">
              <input type="date" value={form.inicio} onChange={set("inicio")} />
            </F>
            <F label="Fin del contrato">
              <input type="date" value={form.fin} onChange={set("fin")} />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Costo mensual (S/)">
              <input type="number" step="0.01" min="0" value={form.costoMensual} onChange={set("costoMensual")} placeholder="2500" />
            </F>
            <F label="Costo luz / mes (S/)" optional>
              <input type="number" step="0.01" min="0" value={form.costoLuzMes} onChange={set("costoLuzMes")} placeholder="150" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="N° de cuenta" optional>
              <input value={form.numeroCuenta} onChange={set("numeroCuenta")} placeholder="0011-0237-..." />
            </F>
            <F label="A nombre de" optional>
              <input value={form.nombreCuenta} onChange={set("nombreCuenta")} placeholder="Titular de la cuenta" />
            </F>
          </div>

          <F label="Razón social" optional>
            <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Razón social del proveedor" />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Guardar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function Proveedores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fichaPanel, setFichaPanel]   = useState(null);
  const [editProv, setEditProv]       = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [alertas, setAlertas]         = useState([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [provs, alts] = await Promise.all([
        getProveedores(),
        isAdmin ? getAlertasPagos() : Promise.resolve([]),
      ]);
      setProveedores(provs);
      setAlertas(alts);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear  = async (form) => { await createProveedor(form); setShowForm(false); cargar(); };
  const handleEditar = async (form) => { await updateProveedor(editProv.id, form); setEditProv(null); cargar(); };
  const handleEliminar = async (p) => {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteProveedor(p.id);
    cargar();
  };

  const formInicial = editProv ? {
    nombre: editProv.nombre, ciudad: editProv.ciudad ?? "",
    ubicacion: editProv.ubicacion, tipoContrato: editProv.tipoContrato,
    elementos: editProv.elementos ?? "", razonSocial: editProv.razonSocial ?? "",
    inicio: editProv.inicio?.slice(0, 10), fin: editProv.fin?.slice(0, 10),
    costoMensual: editProv.costoMensual, costoLuzMes: editProv.costoLuzMes,
    numeroCuenta: editProv.numeroCuenta ?? "", nombreCuenta: editProv.nombreCuenta ?? "",
    relevanciaComercial: editProv.relevanciaComercial,
  } : null;

  return (
    <div className={styles.container}>
      {isAdmin && <AlertasBanner alertas={alertas} />}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Proveedores Outdoor</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${proveedores.length} proveedor${proveedores.length !== 1 ? "es" : ""} registrado${proveedores.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (
            <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nuevo proveedor
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableContainer}>
        {loading ? (
          <p className={styles.empty}>Cargando proveedores…</p>
        ) : proveedores.length === 0 ? (
          <p className={styles.empty}>No hay proveedores registrados aún.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Proveedor</th>
                <th>Propiedad</th>
                <th>Tipo de Contrato</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Vigencia</th>
                <th>Ficha</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => {
                const vigente = esVigente(p.fin);
                return (
                  <tr key={p.id}>
                    <td className={styles.tdCodigo}>{p.codigo}</td>

                    <td>
                      <div className={styles.tdProveedor}>
                        <span className={styles.provNombre}>{p.nombre}</span>
                        {p.razonSocial && <span className={styles.provRazon}>{p.razonSocial}</span>}
                      </div>
                    </td>

                    <td>
                      <div className={styles.tdPropiedad}>
                        {p.ciudad && <span className={styles.propCiudad}>{p.ciudad}</span>}
                        <span className={styles.propUbicacion}>{p.ubicacion}</span>
                      </div>
                    </td>

                    <td className={styles.tdContrato}>{p.tipoContrato}</td>
                    <td className={styles.tdFecha}>{fmtDate(p.inicio)}</td>
                    <td className={styles.tdFecha}>{fmtDate(p.fin)}</td>

                    <td>
                      <span className={`${styles.badge} ${vigente ? styles.badgeVigente : styles.badgeVencido}`}>
                        {vigente ? "Vigente" : "Vencido"}
                      </span>
                    </td>

                    <td>
                      <button className={styles.btnFicha} onClick={() => setFichaPanel(p)} title="Ver ficha">
                        <FileText size={14} /> Ver ficha
                      </button>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className={styles.tdActions}>
                          <button className={styles.btnGhost} onClick={() => setEditProv(p)} title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button className={`${styles.btnGhost} ${styles.btnDanger}`} onClick={() => handleEliminar(p)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      {fichaPanel && (
        <FichaProveedorModal
          proveedor={fichaPanel}
          isAdmin={isAdmin}
          onClose={() => setFichaPanel(null)}
          onCuotaUpdated={(updated) => {
            setProveedores((prev) => prev.map((p) =>
              p.id !== updated.proveedorId ? p :
              { ...p, cuotas: p.cuotas.map((c) => c.id === updated.id ? updated : c) }
            ));
            setFichaPanel((prev) => ({
              ...prev,
              cuotas: prev.cuotas.map((c) => c.id === updated.id ? updated : c),
            }));
          }}
        />
      )}

      {showForm && (
        <ProveedorFormModal inicial={null} onSave={handleCrear} onCancel={() => setShowForm(false)} />
      )}

      {editProv && (
        <ProveedorFormModal inicial={formInicial} onSave={handleEditar} onCancel={() => setEditProv(null)} />
      )}
    </div>
  );
}
