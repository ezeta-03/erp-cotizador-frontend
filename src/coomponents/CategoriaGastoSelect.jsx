import { Field } from "../components/ui";
import { GRUPO_GASTO_LABEL, nombreCategoria } from "../constants/cuentas";

// Selector de categoría de gasto: agrupado en costo de venta / gasto operativo,
// con las subcategorías bajo su categoría principal.
// categorias: árbol de /cuentas-por-pagar/categorias (solo activas).
// actual: categoría que ya tiene el registro ({ id, nombre, padre }); si se
// desactivó y no está en el árbol, se muestra igual para no perderla al guardar.
export default function CategoriaGastoSelect({
  categorias = [], value, onChange, actual, label = "Categoría de gasto", vacio = "Sin categoría", ...rest
}) {
  const ids = new Set(categorias.flatMap((c) => [c.id, ...(c.hijos || []).map((h) => h.id)]).map(String));
  const huerfana = value && !ids.has(String(value)) && actual && String(actual.id) === String(value);
  return (
    <Field as="select" label={label} value={value ?? ""} onChange={(e) => onChange(e.target.value)} {...rest}>
      <option value="">{vacio}</option>
      {huerfana && <option value={value}>{nombreCategoria(actual)} (inactiva)</option>}
      {Object.entries(GRUPO_GASTO_LABEL).map(([grupo, etiqueta]) => {
        const principales = categorias.filter((c) => c.grupo === grupo);
        if (!principales.length) return null;
        return (
          <optgroup key={grupo} label={etiqueta}>
            {principales.flatMap((c) => [
              <option key={c.id} value={c.id}>{c.nombre}</option>,
              ...(c.hijos || []).map((h) => <option key={h.id} value={h.id}>{"   "}{c.nombre} › {h.nombre}</option>),
            ])}
          </optgroup>
        );
      })}
    </Field>
  );
}
