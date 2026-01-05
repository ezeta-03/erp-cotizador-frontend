import { useEffect, useState } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { crearCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";

export default function Cotizaciones() {
  const { user } = useAuth(); // aquí tienes el usuario logueado
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const token = localStorage.getItem("token");
  const [numeroCotizacion] = useState(() => `COT-${Date.now()}`);
  // margen fijo oculto
  // const margen = 30;

  // Cargar clientes y productos
  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const agregarProducto = (producto) => {
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        categoria: producto.categoria,
        unidad: producto.unidad,
        material: producto.material,
        precio: producto.precio_final,
        cantidad: 1,
        subtotal: producto.precio_final * 1,
      },
    ]);
  };

  const actualizarItem = (index, field, value) => {
    const nuevos = [...items];
    nuevos[index][field] = Number(value);
    nuevos[index].subtotal = nuevos[index].cantidad * nuevos[index].precio;
    setItems(nuevos);
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const guardarCotizacion = async () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona cliente y productos");
      return;
    }
    // const numero = `COT-${new Date().getTime()}`;
    const data = {
      numero: numeroCotizacion,
      clienteId,
      usuarioId: user.id,
      total,
      items: items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        precio: i.precio,
        subtotal: i.subtotal,
      })),
    };
    try {
      const cotizacion = await crearCotizacion(data);
      alert("Cotización creada");
      window.open(
        `${import.meta.env.VITE_API_URL}/cotizaciones/${
          cotizacion.id
        }/pdf?token=${token}`,
        "_blank"
      );
    } catch (error) {
      console.error("Error creando cotización:", error);
      alert("Error creando cotización");
    }
  };

  return (
    <div>
      <h2>Nueva Cotización</h2>

      {/* Cliente con búsqueda */}
      <input
        list="clientes"
        placeholder="Selecciona o escribe cliente"
        onChange={(e) => {
          const cliente = clientes.find(
            (c) => c.nombreComercial === e.target.value
          );
          if (cliente) setClienteId(cliente.id);
        }}
      />
      <datalist id="clientes">
        {clientes.map((c) => (
          <option key={c.id} value={c.nombreComercial} />
        ))}
      </datalist>

      {/* Producto con búsqueda */}
      <input
        list="productos"
        placeholder="Selecciona o escribe producto"
        value={productoSeleccionado}
        onChange={(e) => setProductoSeleccionado(e.target.value)}
      />
      <datalist id="productos">
        {productos.map((p) => (
          <option key={p.id} value={p.material} />
        ))}
      </datalist>

      <button
        className="btn-primary"
        onClick={() => {
          const producto = productos.find(
            (p) => p.material === productoSeleccionado
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
            <th>Categoría</th>
            <th>Unidad</th>
            <th>Material</th>
            <th>Precio Final</th>
            <th>Cant.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i, idx) => (
            <tr key={idx}>
              <td>
                <input type="text" value={i.categoria} disabled />
              </td>
              <td>
                <input type="text" value={i.unidad || ""} disabled />
              </td>
              <td>
                <input type="text" value={i.material} disabled />
              </td>
              <td>
                <input type="number" value={i.precio.toFixed(2)} disabled />
              </td>
              <td>
                <input
                  type="tel"
                  value={i.cantidad}
                  onChange={(e) =>
                    actualizarItem(idx, "cantidad", e.target.value)
                  }
                />
              </td>
              <td>{i.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <h3>Total: S/ {total.toFixed(2)}</h3>

      <button className="btn-primary" onClick={guardarCotizacion}>
        Guardar y PDF
      </button>
    </div>
  );
}
