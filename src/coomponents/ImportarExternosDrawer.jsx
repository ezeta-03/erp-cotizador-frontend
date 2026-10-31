import { useEffect, useState } from "react";
import { Download, FileCheck, Upload } from "lucide-react";
import { Badge, Button, Drawer, Table } from "../components/ui";
import { descargarPlantillaExternos, importarComprobantesExternos } from "../api/comprobantes";

const TONO = { OK: "green", ERROR: "red", DUPLICADO: "gray" };

// Carga masiva de comprobantes del portal SOL desde Excel: primero se valida
// (simulación) y luego se importan solo las filas correctas.
export default function ImportarExternosDrawer({ open, onClose, onImportado, showToast }) {
  const [archivo, setArchivo] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setArchivo(null);
    setResultado(null);
    setError(null);
  }, [open]);

  const procesar = async (simular) => {
    setError(null);
    setOcupado(true);
    try {
      const r = await importarComprobantesExternos(archivo, simular);
      setResultado(r);
      if (!simular) {
        showToast(`${r.importados} comprobante${r.importados !== 1 ? "s" : ""} importado${r.importados !== 1 ? "s" : ""}`, "success");
        onImportado?.();
      }
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo procesar el archivo");
    } finally {
      setOcupado(false);
    }
  };

  const ok = resultado?.filas.filter((x) => x.estado === "OK").length ?? 0;
  const columnas = [
    { key: "fila", label: "Fila" },
    { key: "numero", label: "Comprobante", render: (x) => <strong>{x.numero || "—"}</strong> },
    { key: "estado", label: "Estado", render: (x) => <Badge tone={TONO[x.estado]}>{x.estado}</Badge> },
    { key: "mensaje", label: "Detalle" },
  ];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      eyebrow="Cuentas por cobrar"
      title="Importar comprobantes del portal SOL"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cerrar</Button>
          <Button variant="secondary" icon={FileCheck} disabled={!archivo} loading={ocupado && !resultado} onClick={() => procesar(true)}>
            Validar
          </Button>
          <Button icon={Upload} disabled={!resultado?.simulado || ok === 0} loading={ocupado && !!resultado} onClick={() => procesar(false)}>
            Importar {ok > 0 ? `${ok} fila${ok !== 1 ? "s" : ""}` : ""}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--color-text3)", fontSize: "var(--text-sm)" }}>
          Llena la plantilla con una fila por comprobante (el reporte de comprobantes emitidos de SOL tiene estos datos).
          Primero valida el archivo; al importar se omiten las filas con error y las ya registradas.
        </p>
        <div>
          <Button variant="ghost" icon={Download} onClick={() => descargarPlantillaExternos().catch(() => showToast("No se pudo descargar la plantilla"))}>
            Descargar plantilla
          </Button>
        </div>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => { setArchivo(e.target.files?.[0] || null); setResultado(null); }}
        />
        {error && (
          <div style={{ padding: "0.5rem 0.75rem", borderRadius: 6, color: "var(--badge-red-text)", background: "var(--color-danger-bg)" }}>{error}</div>
        )}
        {resultado && (
          <>
            <div style={{ fontSize: "var(--text-sm)" }}>
              {resultado.simulado
                ? <>Validación: <strong>{ok}</strong> listas para importar de {resultado.filas.length}.</>
                : <>Importados: <strong>{resultado.importados}</strong> de {resultado.filas.length}.</>}
            </div>
            <Table columns={columnas} rows={resultado.filas.map((x) => ({ ...x, id: x.fila }))} empty="Sin filas" />
          </>
        )}
      </div>
    </Drawer>
  );
}
