import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Pencil, Plus } from "lucide-react";
import { Badge, Button, Drawer, Field, Table } from "../components/ui";
import { getCuentasFinancieras, getMovimientosCuenta, guardarCuentaFinanciera } from "../api/cajaBancos";
import { monto } from "../utils/formato";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import { TIPO_CUENTA_LABEL } from "../constants/cajaBancos";
import styles from "./cuentas.module.scss";

const fechaCorta = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const hoy = () => new Date().toLocaleDateString("en-CA");
const TONO_TIPO = { BANCO: "blue", CAJA: "green", DETRACCIONES: "orange", BILLETERA: "purple" };
const ORIGEN_LABEL = { COBRO: "Cobro", PAGO: "Pago", CUOTA_PANEL: "Alquiler de panel" };
const vacia = () => ({
  nombre: "", tipo: "BANCO", banco: "", numero: "", cci: "", moneda: "PEN", saldoInicial: "0", fechaSaldoInicial: hoy(), activo: true,
});

// Caja y Bancos: cuentas de la empresa con su saldo y sus movimientos (cobros,
// pagos y cuotas de paneles registrados en Cuentas por cobrar / por pagar).
export default function CajaBancos() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [seleccion, setSeleccion] = useState(null);
  const [movs, setMovs] = useState(null);
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const [editar, setEditar] = useState(null); // null cerrado, {} nueva, cuenta = editar
  const [form, setForm] = useState(vacia());
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState(null);
  const { show: showToast, ToastNode } = useToast();

  const cargar = useCallback(() => {
    getCuentasFinancieras()
      .then((d) => {
        setDatos(d);
        setSeleccion((s) => s ?? d.cuentas.find((c) => c.activo)?.id ?? null);
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las cuentas"));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!seleccion) return;
    setMovs(null);
    getMovimientosCuenta(seleccion, rango).then(setMovs).catch(() => setMovs({ movimientos: [], error: true }));
  }, [seleccion, rango]);

  const abrir = (c) => {
    setEditar(c);
    setErrorForm(null);
    setForm(c.id ? {
      ...vacia(), ...Object.fromEntries(Object.keys(vacia()).map((k) => [k, c[k] ?? vacia()[k]])),
      saldoInicial: String(c.saldoInicial),
    } : vacia());
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = async () => {
    setGuardando(true);
    setErrorForm(null);
    try {
      const c = await guardarCuentaFinanciera(editar.id, { ...form, saldoInicial: Number(form.saldoInicial) || 0 });
      showToast(`Cuenta ${c.nombre} guardada`, "success");
      setEditar(null);
      cargar();
      if (editar.id === seleccion) setRango((r) => ({ ...r })); // recarga los movimientos
      if (!editar.id) setSeleccion(c.id);
    } catch (err) {
      setErrorForm(err.response?.data?.message || "No se pudo guardar la cuenta");
    } finally {
      setGuardando(false);
    }
  };

  if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  if (!datos) return (
    <div className={styles.container} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Spinner size={18} /> Cargando cuentas...
    </div>
  );

  const activas = datos.cuentas.filter((c) => c.activo);
  const inactivas = datos.cuentas.filter((c) => !c.activo);
  const actual = datos.cuentas.find((c) => c.id === seleccion);
  const M = (v) => monto(v, actual?.moneda || "PEN");

  const tarjeta = (c) => {
    const activa = c.id === seleccion;
    return (
      <div key={c.id} role="button" tabIndex={0} onClick={() => setSeleccion(c.id)} onKeyDown={(e) => e.key === "Enter" && setSeleccion(c.id)}
        className={styles.kpi}
        style={{ cursor: "pointer", outline: activa ? "2px solid var(--color-accent)" : "none", opacity: c.activo ? 1 : 0.6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
          <div style={{ minWidth: 0 }}>
            <p className={styles.kpiLabel} style={{ textTransform: "none", letterSpacing: 0, fontSize: "var(--text-sm)", color: "var(--color-text)" }}>
              <strong>{c.nombre}</strong>
            </p>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
              <Badge tone={TONO_TIPO[c.tipo]}>{TIPO_CUENTA_LABEL[c.tipo]}</Badge>
              <Badge tone="gray">{c.moneda === "USD" ? "Dólares" : "Soles"}</Badge>
              {!c.activo && <Badge tone="gray">Inactiva</Badge>}
            </div>
          </div>
          <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Editar ${c.nombre}`} onClick={(e) => { e.stopPropagation(); abrir(c); }} />
        </div>
        <p className={styles.kpiValor} style={{ marginTop: "0.5rem", color: c.saldo < 0 ? "var(--color-danger)" : undefined }}>{monto(c.saldo, c.moneda)}</p>
        <p className={styles.kpiNota}>
          {[c.banco, c.numero].filter(Boolean).join(" · ") || "—"}
        </p>
        <p className={styles.kpiNota}>Desde {fechaCorta(c.fechaSaldoInicial)}: inicial {monto(c.saldoInicial, c.moneda)}</p>
      </div>
    );
  };

  const columnas = [
    { key: "fecha", label: "Fecha", render: (m) => fechaCorta(m.fecha) },
    { key: "concepto", label: "Concepto", render: (m) => (
      <>
        <strong>{m.concepto}</strong>
        <div className={styles.sub}>{ORIGEN_LABEL[m.origen]}{m.numeroOperacion ? ` · op. ${m.numeroOperacion}` : ""}</div>
      </>
    ) },
    { key: "tercero", label: "Cliente / proveedor", render: (m) => m.tercero || "—" },
    { key: "ingreso", label: "Ingreso", align: "right", render: (m) => (m.ingreso ? <span style={{ color: "var(--color-success)" }}>{M(m.ingreso)}</span> : <span className={styles.sub}>—</span>) },
    { key: "egreso", label: "Egreso", align: "right", render: (m) => (m.egreso ? <span style={{ color: "var(--color-danger)" }}>{M(m.egreso)}</span> : <span className={styles.sub}>—</span>) },
    { key: "saldo", label: "Saldo", align: "right", render: (m) => <strong>{M(m.saldo)}</strong> },
  ];

  const ingresosRango = movs?.movimientos?.reduce((a, m) => a + m.ingreso, 0) || 0;
  const egresosRango = movs?.movimientos?.reduce((a, m) => a + m.egreso, 0) || 0;

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Caja y Bancos</h2>
            <p className={styles.subtitle}>
              Saldos con los cobros y pagos registrados en Cuentas por cobrar y por pagar
            </p>
          </div>
          <div className={styles.acciones}>
            <Button icon={Plus} onClick={() => abrir({})}>Nueva cuenta</Button>
          </div>
        </div>

        {datos.cuentas.length === 0 ? (
          <div className={styles.kpi} style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ margin: 0 }}><strong>Aún no hay cuentas.</strong></p>
            <p className={styles.sub}>Crea tus bancos, la caja y la cuenta de detracciones del Banco de la Nación con su saldo a una fecha.
              Desde entonces cada cobro y pago se registrará en una de ellas.</p>
            <Button icon={Plus} onClick={() => abrir({})}>Crear la primera cuenta</Button>
          </div>
        ) : (
          <>
            <div className={styles.kpis}>
              {Object.entries(datos.totales).sort(([a], [b]) => (a === "PEN" ? -1 : b === "PEN" ? 1 : 0)).map(([moneda, total]) => (
                <div key={moneda} className={styles.kpi} style={{ background: "var(--color-input-bg)" }}>
                  <p className={styles.kpiLabel}>Total en {moneda === "USD" ? "dólares" : "soles"}</p>
                  <p className={styles.kpiValor}>{monto(total, moneda)}</p>
                  <p className={styles.kpiNota}>{activas.filter((c) => c.moneda === moneda).length} cuenta(s) activa(s)</p>
                </div>
              ))}
            </div>
            <div className={styles.kpis}>{activas.map(tarjeta)}</div>
            {inactivas.length > 0 && (
              <details style={{ marginBottom: "1rem" }}>
                <summary className={styles.sub} style={{ cursor: "pointer" }}>Cuentas inactivas ({inactivas.length})</summary>
                <div className={styles.kpis} style={{ marginTop: "0.75rem" }}>{inactivas.map(tarjeta)}</div>
              </details>
            )}

            {actual && (
              <>
                <div className={styles.tabs} style={{ alignItems: "center" }}>
                  <strong style={{ marginRight: "auto" }}>Movimientos de {actual.nombre}</strong>
                  <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Desde" title="Desde"
                    value={rango.desde} max={rango.hasta || undefined} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
                  <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Hasta" title="Hasta"
                    value={rango.hasta} min={rango.desde || undefined} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
                </div>
                {!movs ? (
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={16} /> Cargando movimientos...</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", fontSize: "var(--text-sm)", marginBottom: "0.75rem" }}>
                      <span>Saldo anterior: <strong>{M(movs.saldoAnterior ?? 0)}</strong></span>
                      <span style={{ color: "var(--color-success)" }}><ArrowDownLeft size={14} /> Ingresos {M(ingresosRango)}</span>
                      <span style={{ color: "var(--color-danger)" }}><ArrowUpRight size={14} /> Egresos {M(egresosRango)}</span>
                      <span>Saldo final: <strong>{M(movs.saldoFinal ?? actual.saldo)}</strong></span>
                    </div>
                    <Table columns={columnas} rowKey="clave"
                      rows={(movs.movimientos || []).map((m) => ({ ...m, clave: `${m.origen}-${m.id}` }))}
                      empty="Sin movimientos en este rango" />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      <Drawer
        open={!!editar}
        onClose={() => setEditar(null)}
        eyebrow="Caja y Bancos"
        title={editar?.id ? `Editar ${editar.nombre}` : "Nueva cuenta"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditar(null)}>Cancelar</Button>
            <Button onClick={guardar} loading={guardando} disabled={!form.nombre.trim() || !form.fechaSaldoInicial}>Guardar</Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: "0.9rem" }}>
          <Field label="Nombre" value={form.nombre} placeholder="Ej. BCP Soles, Caja chica, BN Detracciones" onChange={(e) => set("nombre", e.target.value)} required />
          <div className={styles.grid2}>
            <Field as="select" label="Tipo" value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              {Object.entries(TIPO_CUENTA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Field>
            <Field as="select" label="Moneda" value={form.moneda} disabled={editar?.movimientos > 0}
              hint={editar?.movimientos > 0 ? "Tiene movimientos: no se puede cambiar" : undefined} onChange={(e) => set("moneda", e.target.value)}>
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </Field>
          </div>
          {form.tipo !== "CAJA" && (
            <div className={styles.grid2}>
              <Field label="Banco / billetera" value={form.banco} onChange={(e) => set("banco", e.target.value)} />
              <Field label="N.° de cuenta" value={form.numero} onChange={(e) => set("numero", e.target.value)} />
              <Field label="CCI" value={form.cci} onChange={(e) => set("cci", e.target.value)} />
            </div>
          )}
          <div className={styles.grid2}>
            <Field label="Saldo inicial" type="number" step="any" value={form.saldoInicial} onChange={(e) => set("saldoInicial", e.target.value)} />
            <Field label="Fecha del saldo inicial" type="date" max={hoy()} value={form.fechaSaldoInicial}
              hint="Solo cuentan los cobros y pagos desde esta fecha" onChange={(e) => set("fechaSaldoInicial", e.target.value)} />
          </div>
          {editar?.id && (
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} /> Activa (se puede elegir al cobrar y pagar)
            </label>
          )}
          {errorForm && <div className={styles.error}>{errorForm}</div>}
        </div>
      </Drawer>
    </>
  );
}
