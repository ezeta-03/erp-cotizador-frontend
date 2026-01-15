import { useEffect, useState } from "react";
import { actividadesClientes } from "../api/clientes";
import styles from "./actividadClienteModal.module.scss";

export default function ActividadClienteModal({ cliente, onClose }) {
  const [actividad, setActividad] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const cargarActividad = async () => {
      if (!cliente) return;
      setActividad([]); // limpiar antes de cargar
      setCurrentPage(1); // reset page
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

  const totalPages = Math.ceil(actividad.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = actividad.slice(startIndex, startIndex + itemsPerPage);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
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
              {currentItems.map((c) => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.items.map((i) => i.producto.material || i.producto.servicio).join(", ")}</td>
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

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.btnPagination}
            >
              Anterior
            </button>
            <span>Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.btnPagination}
            >
              Siguiente
            </button>
          </div>
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
