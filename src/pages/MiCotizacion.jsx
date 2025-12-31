import { useEffect, useState } from "react";
import api from "../api/axios";

export default function MiCotizacion() {
  const [cotizacion, setCotizacion] = useState(null);
  const [comentario, setComentario] = useState("");
  const token = localStorage.getItem("token");


  useEffect(() => {
    api.get("/cotizaciones/mia").then(res => setCotizacion(res.data));
  }, []);

  if (!cotizacion) {
    return <p>No tienes cotizaciones aún</p>;
  }

  const responder = async (estado) => {
    await api.post(`/cotizaciones/${cotizacion.id}/responder`, {
      estado,
      comentario
    });
    alert("Respuesta enviada");
    window.location.reload();
  };

  return (
    <div>
      <h2>Mi última cotización</h2>

      <p><b>Número:</b> {cotizacion.numero}</p>
      <p><b>Estado:</b> {cotizacion.estado}</p>
      <p><b>Total:</b> S/. {cotizacion.total.toFixed(2)}</p>

      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {cotizacion.items.map(i => (
            <tr key={i.id}>
              <td>{i.producto.nombre}</td>
              <td>{i.cantidad}</td>
              <td>{i.precio.toFixed(2)}</td>
              <td>{i.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      {/* <a
        href={`${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacion.id}/pdf`}
        target="_blank"
      >
        Descargar PDF
      </a> */}

      <a
        href={`${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacion.id}/pdf?token=${token}`}
        target="_blank"
      >
        Descargar PDF
      </a>

      {cotizacion.estado === "PENDIENTE" && (
        <>
          <br /><br />
          <textarea
            placeholder="Comentario (opcional)"
            value={comentario}
            onChange={e => setComentario(e.target.value)}
          />

          <br />
          <button onClick={() => responder("APROBADA")}>
            Aprobar
          </button>

          <button onClick={() => responder("RECHAZADA")}>
            Rechazar
          </button>
        </>
      )}
    </div>
  );
}
