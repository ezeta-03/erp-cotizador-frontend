import { useState } from "react";
import { crearCotizacion } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import useAuth from "../auth/useAuth";
import CotizacionModal from "./CotizacionModal";
import VistaPreviaCotizacion from "../coomponents/VistaPreviaCotizacion";
import styles from "./cotizaciones.module.scss";
export default function Cotizaciones() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [showPreview, setShowPreview] = useState(false);
  const [cotizacionPreview, setCotizacionPreview] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const guardarCotizacion = async ({ clienteId, items, margen, conIgv }) => {
    const data = {
      clienteId,
      usuarioId: user.id,
      margen,
      conIgv,
      items: items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        medida: i.medida || 1,
        medidaAncho: i.medidaAncho || null,
        medidaAlto: i.medidaAlto || null,
        precio: i.precio,
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
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nueva Cotización</h1>
          <p className={styles.subtitle}>Genera una cotización rápida para tus clientes</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            📝 Crear Cotización
          </button>
        </div>
      </div>

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
