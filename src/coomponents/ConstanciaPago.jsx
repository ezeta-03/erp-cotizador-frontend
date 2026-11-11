import { useRef, useState } from "react";
import { Paperclip, ScanText, X } from "lucide-react";
import { Button } from "../components/ui";
import Spinner from "./Spinner";
import { leerConstancia } from "../utils/ocrConstancia";

const ACEPTA = "image/jpeg,image/png,image/webp,application/pdf";
const MAX = 5 * 1024 * 1024;
const MAX_ARCHIVOS = 10;
const kb = (n) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`);
const chip = {
  display: "inline-flex", alignItems: "center", gap: "0.3rem", maxWidth: "100%",
  padding: "0.15rem 0.5rem", borderRadius: 999, fontSize: "var(--text-xs)",
  background: "var(--badge-gray-bg)", color: "var(--color-text2)", border: 0, cursor: "pointer",
};

// Archivos de las constancias al registrar un pago (uno o varios): el primero
// que se elige se lee con OCR y los datos reconocidos se pasan a onLeido para
// precargar el formulario.
export function ConstanciaInput({ archivos = [], onArchivos, onLeido, etiqueta = "Adjuntar constancia y leer datos", leer = true }) {
  const input = useRef(null);
  const [estado, setEstado] = useState(null); // null | "leyendo" | { mensaje, ok }

  const elegir = async (e) => {
    const elegidos = [...(e.target.files || [])];
    e.target.value = "";
    if (!elegidos.length) return;
    const grandes = elegidos.filter((f) => f.size > MAX);
    const validos = elegidos.filter((f) => f.size <= MAX);
    if (grandes.length) setEstado({ mensaje: `${grandes.map((f) => f.name).join(", ")} supera${grandes.length > 1 ? "n" : ""} los 5 MB`, ok: false });
    if (!validos.length) return;
    const eraVacio = archivos.length === 0;
    onArchivos([...archivos, ...validos].slice(0, MAX_ARCHIVOS));
    if (!leer || !eraVacio || !onLeido) return;
    setEstado("leyendo");
    try {
      const datos = await leerConstancia(validos[0]);
      const leidos = ["numeroOperacion", "fecha", "monto"].filter((k) => datos[k]);
      onLeido(datos);
      setEstado(leidos.length
        ? { mensaje: `Se leyó: ${[datos.numeroOperacion && `op. ${datos.numeroOperacion}`, datos.monto && `monto ${datos.monto}`, datos.fecha, datos.banco].filter(Boolean).join(" · ")}. Revísalo antes de guardar.`, ok: true }
        : { mensaje: "No se reconocieron datos; complétalos a mano. La constancia se guardará igual.", ok: false });
    } catch {
      setEstado({ mensaje: "No se pudo leer la constancia; complétala a mano. Se guardará igual.", ok: false });
    }
  };

  const quitar = (i) => {
    const resto = archivos.filter((_, j) => j !== i);
    onArchivos(resto);
    if (!resto.length) setEstado(null);
  };

  return (
    <div style={{ display: "grid", gap: "0.35rem" }}>
      <input ref={input} type="file" accept={ACEPTA} multiple hidden onChange={elegir} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
        {archivos.map((f, i) => (
          <span key={`${f.name}-${i}`} style={{ ...chip, cursor: "default" }}>
            <Paperclip size={12} /> <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{f.name}</span> · {kb(f.size)}
            <button type="button" onClick={() => quitar(i)} disabled={estado === "leyendo"} aria-label={`Quitar ${f.name}`}
              style={{ all: "unset", cursor: "pointer", display: "inline-flex" }}>
              <X size={12} />
            </button>
          </span>
        ))}
        {archivos.length < MAX_ARCHIVOS && (
          archivos.length
            ? <Button size="sm" variant="ghost" icon={Paperclip} onClick={() => input.current.click()}>Agregar otro</Button>
            : <Button size="sm" variant="secondary" icon={leer ? ScanText : Paperclip} onClick={() => input.current.click()}>{etiqueta}</Button>
        )}
      </div>
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

// Constancias ya guardadas de un pago: abrir (URL firmada), quitar y añadir
// otras (onAgregar recibe la lista de archivos elegidos).
export function AdjuntosPago({ adjuntos = [], onAbrir, onEliminar, onAgregar, etiqueta = "Adjuntar constancia" }) {
  const input = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const elegir = async (e) => {
    const archivos = [...(e.target.files || [])].slice(0, MAX_ARCHIVOS);
    e.target.value = "";
    if (!archivos.length) return;
    setSubiendo(true);
    try {
      await onAgregar(archivos);
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
      <input ref={input} type="file" accept={ACEPTA} multiple hidden onChange={elegir} />
      <button type="button" style={chip} onClick={() => input.current.click()} disabled={subiendo}>
        {subiendo ? <Spinner size={10} /> : <Paperclip size={12} />} {adjuntos.length ? "Otros" : etiqueta}
      </button>
    </div>
  );
}
