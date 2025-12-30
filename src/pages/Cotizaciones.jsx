import { useEffect, useState } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { crearCotizacion } from "../api/cotizaciones";

export default function Cotizaciones() {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [margen, setMargen] = useState(30);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const token = localStorage.getItem("token");

  // Cargar clientes y productos
  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const agregarProducto = (producto) => {
    const precioUnitario =
      Number(producto.precio_material) + Number(producto.precio_mano_obra);

    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio: precioUnitario,
        subtotal: precioUnitario * 1,
      },
    ]);
  };

  const actualizarItem = (index, field, value) => {
    const nuevos = [...items];

    nuevos[index][field] = Number(value);
    nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precio;

    setItems(nuevos);
  };

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal + subtotal * (margen / 100);

  const guardarCotizacion = async () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona cliente y productos");
      return;
    }

    const data = {
      numero: `COT-${Date.now()}`,
      clienteId,
      margen,
      items: items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        precio: i.precio,
      })),
    };

    const cotizacion = await crearCotizacion(data);
    alert("Cotización creada");

    window.open(
      `${import.meta.env.VITE_API_URL}/cotizaciones/${
        cotizacion.id
      }/pdf?token=${token}`,
      "_blank"
    );
  };

  return (
    <div>
      <h2>Nueva Cotización</h2>
      {/* Cliente */}
      <select onChange={(e) => setClienteId(e.target.value)}>
        <option value="">Selecciona cliente</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nombre}
          </option>
        ))}
      </select>
      {/* Productos */}
      <select
        value={productoSeleccionado}
        onChange={(e) => setProductoSeleccionado(e.target.value)}
      >
        <option value="">Selecciona producto</option>
        {productos.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          const producto = productos.find(
            (p) => p.id === Number(productoSeleccionado)
          );
          if (producto) agregarProducto(producto);
          setProductoSeleccionado("");
        }}
      >
        Agregar producto
      </button>
      {/* Tabla */}
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
          {items.map((i, idx) => (
            <tr key={idx}>
              <td>{i.nombre}</td>
              <td>
                <input
                  type="number"
                  value={i.cantidad}
                  onChange={(e) =>
                    actualizarItem(idx, "cantidad", e.target.value)
                  }
                />
              </td>
              <td>
                <input
                  type="number"
                  value={i.precio}
                  onChange={(e) =>
                    actualizarItem(idx, "precio", e.target.value)
                  }
                />
              </td>
              <td>{i.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totales */}
      <p>Subtotal: {subtotal.toFixed(2)}</p>
      <input
        type="number"
        value={margen}
        onChange={(e) => setMargen(Number(e.target.value))}
      />
      % margen
      <h3>Total: {total.toFixed(2)}</h3>
      <button onClick={guardarCotizacion}>Guardar y PDF</button>
    </div>
  );
}
