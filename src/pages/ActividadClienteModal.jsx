import { useEffect, useState } from "react";
import { actividadesClientes } from "../api/clientes";
import styles from "./actividadClienteModal.module.scss";

export default function ActividadClienteModal({ cliente, onClose }) {
  const [actividad, setActividad] = useState([]);

  useEffect(() => {
    const cargarActividad = async () => {
      if (!cliente) return;
      setActividad([]); // limpiar antes de cargar
      try {
        const data = await actividadesClientes(cliente.id); // ✅ ahora directo
        setActividad(data);
      } catch (error) {
        console.error("❌ Error cargando actividad del cliente:", error);
        setActividad([]);
      }
    };
    cargarActividad();
  }, [cliente]);

  if (!cliente) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>Actividad de {cliente.nombreComercial}</h2>

        {actividad.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>N° Cotización</th>
                <th>Productos</th>
                <th>Fecha</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {actividad.map((c) => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.items.map((i) => i.producto.material).join(", ")}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>S/. {c.total.toFixed(2)}</td>
                  <td>{c.estado}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No hay actividad registrada</p>
        )}

        <div className={styles.actions}>
          <button className={styles.btnSecondary} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
