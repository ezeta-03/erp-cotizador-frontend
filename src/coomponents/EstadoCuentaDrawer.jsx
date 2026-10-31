import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText, Mail, RefreshCw } from "lucide-react";
import { Button, Drawer, Field, Table } from "../components/ui";
import { descargarEstadoCuentaExcel, enviarRecordatorioCobro, getEstadoCuenta } from "../api/cuentas";
import { monto } from "../utils/formato";

const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");

// PDF del estado de cuenta (jsPDF, igual que el PDF de cotizaciones).
async function descargarPdf(datos) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text("Estado de cuenta", 40, 48);
  doc.setFontSize(9);
  doc.text(`${datos.emisor.razonSocial} — RUC ${datos.emisor.ruc}`, 40, 64);
  doc.text(`Cliente: ${datos.cliente.nombre} (${datos.cliente.numDoc})`, 40, 78);
  doc.text(`Periodo: ${datos.desde ? fechaCorta(datos.desde) : "desde el inicio"} al ${fechaCorta(datos.hasta)}`, 40, 92);
  let y = 108;
  for (const m of datos.monedas) {
    const M = (v) => monto(v, m.moneda);
    autoTable(doc, {
      startY: y,
      head: [["Fecha", "Documento", "Concepto", "Cargo", "Abono", "Saldo"]],
      body: [
        ...(datos.desde ? [[fechaCorta(datos.desde), "", "Saldo anterior", "", "", M(m.saldoInicial)]] : []),
        ...m.movimientos.map((x) => [fechaCorta(x.fecha), x.documento, x.concepto, x.cargo ? M(x.cargo) : "", x.abono ? M(x.abono) : "", M(x.saldo)]),
      ],
      foot: [["", "", `Saldo final (${m.moneda === "USD" ? "dólares" : "soles"})`, "", "", M(m.saldoFinal)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [55, 55, 55] },
      footStyles: { fillColor: [235, 235, 235], textColor: 20, fontStyle: "bold" },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    });
    y = doc.lastAutoTable.finalY + 20;
  }
  doc.save(`estado-cuenta-${datos.cliente.numDoc}.pdf`);
}

// Estado de cuenta de un cliente: cargos (comprobantes, notas de débito) y
// abonos (cobros, retenciones, detracciones, notas de crédito) con saldo.
export default function EstadoCuentaDrawer({ cliente, onClose, onRecordatorio, showToast }) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const cargar = async (rango = { desde, hasta }) => {
    if (!cliente) return;
    setCargando(true);
    setError(null);
    try {
      setDatos(await getEstadoCuenta(cliente.numDoc, { desde: rango.desde || undefined, hasta: rango.hasta || undefined }));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo cargar el estado de cuenta");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (!cliente) return;
    setDesde("");
    setHasta("");
    setDatos(null);
    cargar({ desde: "", hasta: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente]);

  const recordatorio = async () => {
    const para = prompt(
      `Enviar recordatorio de pago a ${cliente.nombre}:\n(varios correos separados por coma; vacío = el correo registrado del cliente)`,
      datos?.cliente.email || ""
    );
    if (para === null) return;
    setEnviando(true);
    try {
      const r = await enviarRecordatorioCobro(cliente.numDoc, para.trim());
      showToast(`Recordatorio enviado a ${r.enviadoA} (${r.documentos} documento${r.documentos !== 1 ? "s" : ""})`, "success");
      onRecordatorio?.();
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo enviar el recordatorio");
    } finally {
      setEnviando(false);
    }
  };

  const columnas = (moneda) => [
    { key: "fecha", label: "Fecha", render: (x) => fechaCorta(x.fecha) },
    { key: "documento", label: "Documento" },
    { key: "concepto", label: "Concepto" },
    { key: "cargo", label: "Cargo", align: "right", render: (x) => (x.cargo ? monto(x.cargo, moneda) : "") },
    { key: "abono", label: "Abono", align: "right", render: (x) => (x.abono ? monto(x.abono, moneda) : "") },
    { key: "saldo", label: "Saldo", align: "right", render: (x) => <strong>{monto(x.saldo, moneda)}</strong> },
  ];

  return (
    <Drawer
      open={!!cliente}
      onClose={onClose}
      wide
      eyebrow="Estado de cuenta"
      title={cliente?.nombre}
      footer={
        <>
          <Button variant="ghost" icon={Mail} loading={enviando} disabled={!datos?.pendientes.length} onClick={recordatorio}>
            Enviar recordatorio
          </Button>
          <Button variant="secondary" icon={FileSpreadsheet} disabled={!datos}
            onClick={() => descargarEstadoCuentaExcel(cliente.numDoc, { desde: desde || undefined, hasta: hasta || undefined }).catch(() => showToast("No se pudo descargar el Excel"))}>
            Excel
          </Button>
          <Button icon={FileText} disabled={!datos} onClick={() => descargarPdf(datos).catch(() => showToast("No se pudo generar el PDF"))}>PDF</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Field label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Button variant="secondary" icon={RefreshCw} loading={cargando} onClick={() => cargar()}>Aplicar</Button>
        </div>
        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text3)" }}>
          RUC/DNI {cliente?.numDoc}{datos?.cliente.email ? ` · ${datos.cliente.email}` : " · sin correo registrado"}
        </div>
        {error && <div style={{ padding: "0.5rem 0.75rem", borderRadius: 6, color: "var(--badge-red-text)", background: "var(--color-danger-bg)" }}>{error}</div>}
        {datos?.monedas.map((m) => (
          <div key={m.moneda} style={{ display: "grid", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
              <span>{m.moneda === "USD" ? "Dólares" : "Soles"}</span>
              <span>Saldo: {monto(m.saldoFinal, m.moneda)}</span>
            </div>
            {datos.desde && (
              <div style={{ fontSize: "var(--text-sm)" }}>Saldo anterior al {fechaCorta(datos.desde)}: {monto(m.saldoInicial, m.moneda)}</div>
            )}
            <Table dense columns={columnas(m.moneda)} rows={m.movimientos.map((x, i) => ({ ...x, id: i }))} empty="Sin movimientos en el periodo" />
          </div>
        ))}
      </div>
    </Drawer>
  );
}
