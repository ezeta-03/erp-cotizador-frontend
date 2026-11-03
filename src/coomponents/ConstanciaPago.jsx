import { useRef, useState } from "react";
import { Paperclip, ScanText, X } from "lucide-react";
import { Button } from "../components/ui";
import Spinner from "./Spinner";
import { leerConstancia } from "../utils/ocrConstancia";

const ACEPTA = "image/jpeg,image/png,image/webp,application/pdf";
const MAX = 5 * 1024 * 1024;
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
const chip = {
  display: "inline-flex", alignItems: "center", gap: "0.3rem", maxWidth: "100%",
  padding: "0.15rem 0.5rem", borderRadius: 999, fontSize: "var(--text-xs)",
  background: "var(--badge-gray-bg)", color: "var(--color-text2)", border: 0, cursor: "pointer",
};

// Archivo de la constancia al registrar un pago: al elegirlo se lee con OCR y
// los datos reconocidos se pasan a onLeido para precargar el formulario.
export function ConstanciaInput({ archivo, onArchivo, onLeido }) {
  const input = useRef(null);
  const [estado, setEstado] = useState(null); // null | "leyendo" | { mensaje, ok }

  const elegir = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX) return setEstado({ mensaje: "El archivo supera los 5 MB", ok: false });
    onArchivo(f);
    setEstado("leyendo");
    try {
      const datos = await leerConstancia(f);
      const leidos = ["numeroOperacion", "fecha", "monto"].filter((k) => datos[k]);
      onLeido(datos);
      setEstado(leidos.length
        ? { mensaje: `Se leyó: ${[datos.numeroOperacion && `op. ${datos.numeroOperacion}`, datos.monto && `monto ${datos.monto}`, datos.fecha, datos.banco].filter(Boolean).join(" · ")}. Revísalo antes de guardar.`, ok: true }
        : { mensaje: "No se reconocieron datos; complétalos a mano. La constancia se guardará igual.", ok: false });
    } catch {
      setEstado({ mensaje: "No se pudo leer la constancia; complétala a mano. Se guardará igual.", ok: false });
    }
  };

  const quitar = () => {
    onArchivo(null);
    setEstado(null);
  };

  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <input ref={input} type="file" accept={ACEPTA} hidden onChange={elegir} />
      {archivo ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ ...chip, cursor: "default" }}><Paperclip size={12} /> {archivo.name} · {kb(archivo.size)}</span>
          <Button size="sm" variant="ghost" icon={X} onClick={quitar} disabled={estado === "leyendo"}>Quitar</Button>
        </div>
      ) : (
        <div>
          <Button size="sm" variant="secondary" icon={ScanText} onClick={() => input.current.click()}>Adjuntar constancia y leer datos</Button>
        </div>
      )}
      {estado === "leyendo" && (
        <span style={{ display: "flex", gap: "0.4rem", alignItems: "center", fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
          <Spinner size={12} /> Leyendo la constancia… (la primera vez tarda más)
        </span>
      )}
      {estado && estado !== "leyendo" && (
        <span style={{ fontSize: "var(--text-xs)", color: estado.ok ? "var(--color-text2)" : "var(--color-warning)" }}>{estado.mensaje}</span>
      )}
    </div>
  );
}

// Constancias ya guardadas de un pago: abrir (URL firmada), quitar y añadir otra.
export function AdjuntosPago({ adjuntos = [], onAbrir, onEliminar, onAgregar }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setSubiendo(true);
    try {
      await onAgregar(f);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", alignItems: "center", marginTop: "0.2rem" }}>
      {adjuntos.map((a) => (
        <span key={a.id} style={{ ...chip, cursor: "default" }}>
          <button type="button" onClick={() => onAbrir(a)} title="Abrir constancia"
            style={{ all: "unset", cursor: "pointer", display: "inline-flex", gap: "0.3rem", alignItems: "center", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160, whiteSpace: "nowrap" }}>
            <Paperclip size={12} /> {a.nombre}
          </button>
          <button type="button" onClick={() => onEliminar(a)} aria-label="Quitar constancia" style={{ all: "unset", cursor: "pointer", display: "inline-flex" }}>
            <X size={12} />
          </button>
        </span>
      ))}
      <input ref={input} type="file" accept={ACEPTA} hidden onChange={elegir} />
      <button type="button" style={chip} onClick={() => input.current.click()} disabled={subiendo}>
        {subiendo ? <Spinner size={10} /> : <Paperclip size={12} />} {adjuntos.length ? "Otra" : "Adjuntar constancia"}
      </button>
    </div>
  );
}
