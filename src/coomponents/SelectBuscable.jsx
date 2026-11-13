import { useState, useRef, useEffect, useMemo } from "react";
import styles from "./SelectBuscable.module.scss";

// Quita tildes y pasa a minúsculas para que "panel" encuentre "Pánel" y similares.
const normalizar = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/**
 * Select que permite escribir para filtrar las opciones por coincidencia.
 *
 * options: [{ value, label, searchText? }]  — searchText (opcional) es texto extra por el que buscar
 * value:   valor seleccionado (string | number | null)
 * onChange(value | null)
 */
export default function SelectBuscable({
  value,
  onChange,
  options,
  placeholder = "Escribe para buscar…",
  emptyLabel = "Sin selección",
  disabled = false,
  className = "",
  style,
  ariaLabel,
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [resaltado, setResaltado] = useState(0);
  const contenedorRef = useRef(null);
  const listaRef = useRef(null);

  const seleccionado = useMemo(
    () => options.find((o) => String(o.value) === String(value ?? "")) || null,
    [options, value]
  );

  const filtradas = useMemo(() => {
    const q = normalizar(texto.trim());
    if (!q) return options;
    const palabras = q.split(/\s+/);
    return options.filter((o) => {
      const base = normalizar(`${o.label} ${o.searchText ?? ""}`);
      return palabras.every((p) => base.includes(p));
    });
  }, [options, texto]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) return;
    const onDown = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false);
        setTexto("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [abierto]);

  // Mantener visible la opción resaltada al navegar con flechas
  useEffect(() => {
    if (!abierto || !listaRef.current) return;
    const el = listaRef.current.children[resaltado];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [resaltado, abierto]);

  const abrir = () => {
    if (disabled) return;
    setAbierto(true);
    setResaltado(0);
  };

  const elegir = (opcion) => {
    onChange(opcion ? opcion.value : null);
    setAbierto(false);
    setTexto("");
  };

  const onKeyDown = (e) => {
    if (!abierto && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      abrir();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setResaltado((i) => Math.min(i + 1, Math.max(filtradas.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setResaltado((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtradas[resaltado]) elegir(filtradas[resaltado]);
    } else if (e.key === "Escape") {
      setAbierto(false);
      setTexto("");
    }
  };

  // Lo que se muestra en el input: el texto que escribe el usuario o la opción elegida
  const valorInput = abierto ? texto : seleccionado ? seleccionado.label : "";

  return (
    <div ref={contenedorRef} className={`${styles.wrap} ${className}`} style={style}>
      <input
        type="text"
        className={styles.input}
        role="combobox"
        aria-expanded={abierto}
        aria-label={ariaLabel || placeholder}
        autoComplete="off"
        placeholder={seleccionado ? seleccionado.label : placeholder}
        value={valorInput}
        disabled={disabled}
        onFocus={abrir}
        onClick={abrir}
        onChange={(e) => {
          setTexto(e.target.value);
          setResaltado(0);
          if (!abierto) setAbierto(true);
        }}
        onKeyDown={onKeyDown}
      />
      {seleccionado && !disabled && (
        <button
          type="button"
          className={styles.limpiar}
          aria-label="Quitar selección"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => elegir(null)}
        >
          ×
        </button>
      )}
      {abierto && (
        <ul ref={listaRef} className={styles.lista} role="listbox">
          <li
            className={`${styles.opcion} ${styles.opcionVacia}`}
            role="option"
            aria-selected={!seleccionado}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => elegir(null)}
          >
            {emptyLabel}
          </li>
          {filtradas.length === 0 && <li className={styles.sinResultados}>Sin coincidencias</li>}
          {filtradas.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={String(o.value) === String(value ?? "")}
              className={`${styles.opcion} ${i === resaltado ? styles.resaltada : ""}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setResaltado(i)}
              onClick={() => elegir(o)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
