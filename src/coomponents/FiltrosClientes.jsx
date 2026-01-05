import { useState } from "react";
import "../styles/_filters.scss";

export default function FiltrosClientes({ onBuscar }) {
  const [cliente, setCliente] = useState("");
  const [producto, setProducto] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const handleBuscar = () => {
    onBuscar({
      cliente: cliente || undefined,
      producto: producto || undefined,
      desde: desde || undefined,
      hasta: hasta || undefined,
    });
  };

  return (
    <div className="filters-container">
      <input
        placeholder="Buscar cliente"
        value={cliente}
        onChange={(e) => setCliente(e.target.value)}
      />

      <input
        placeholder="Producto cotizado"
        value={producto}
        onChange={(e) => setProducto(e.target.value)}
      />

      <input
        type="date"
        value={desde}
        onChange={(e) => setDesde(e.target.value)}
      />

      <input
        type="date"
        value={hasta}
        onChange={(e) => setHasta(e.target.value)}
      />

      <button className="btn-primary" onClick={handleBuscar}>
        Buscar
      </button>
    </div>
  );
}
