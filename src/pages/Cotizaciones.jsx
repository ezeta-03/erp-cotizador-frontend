import { useState } from "react";
import { crearCotizacion } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import useAuth from "../auth/useAuth";
import CotizacionModal from "../pages/CotizacionModal";
import VistaPreviaCotizacion from "../coomponents/VistaPreviaCotizacion";
import styles from "./cotizaciones.module.scss";
export default function Cotizaciones() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [showPreview, setShowPreview] = useState(false);
  const [cotizacionPreview, setCotizacionPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const guardarCotizacion = async ({ clienteId, items }) => {
    const data = {
      clienteId,
      usuarioId: user.id,
      items: items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        costo_material: i.costo_material,
        adicionales: i.adicionales.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          precio: a.precio,
          seleccionado: a.seleccionado,
        })),
      })),
    };

    try {
      const cotizacion = await crearCotizacion(data);
      alert("Cotización creada");

      // Descargar PDF de forma inteligente (backend primero, jsPDF como fallback)
      await descargarPDFInteligente(cotizacion, token);
    } catch (error) {
      console.error("Error creando cotización:", error);
      alert("Error creando cotización");
    }
  };

  return (
    <div>
      <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
        📝 Nueva Cotización
      </button>

      {showModal && (
        <CotizacionModal
          onClose={() => setShowModal(false)}
          onSave={guardarCotizacion}
        />
      )}

      {showPreview && (
        <VistaPreviaCotizacion
          cotizacion={cotizacionPreview}
          onConfirm={guardarCotizacion}
          onCancel={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
