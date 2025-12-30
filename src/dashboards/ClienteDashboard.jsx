import { useEffect, useState } from "react";
import { getMiUltimaCotizacion } from "../api/cotizaciones";

export default function ClienteDashboard() {
  const [cotizacion, setCotizacion] = useState(null);

  useEffect(() => {
    getMiUltimaCotizacion()
      .then(setCotizacion)
      .catch(() => setCotizacion(null));
  }, []);

  if (!cotizacion) {
    return <p>No tienes cotizaciones aún.</p>;
  }

  return (
    <div>
      <h2>Mi última cotización</h2>

      <p><strong>Número:</strong> {cotizacion.numero}</p>
      <p><strong>Total:</strong> S/ {cotizacion.total.toFixed(2)}</p>
      <p><strong>Fecha:</strong> {new Date(cotizacion.createdAt).toLocaleDateString()}</p>

      <h3>Detalle</h3>
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
          {cotizacion.items.map((i) => (
            <tr key={i.id}>
              <td>{i.producto.nombre}</td>
              <td>{i.cantidad}</td>
              <td>{i.precio.toFixed(2)}</td>
              <td>{(i.cantidad * i.precio).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <br />

      <a
        href={`${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacion.id}/pdf`}
        target="_blank"
      >
        Descargar PDF
      </a>
    </div>
  );
}
