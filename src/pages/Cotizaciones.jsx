import { useEffect, useState } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { crearCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";
import { getConfiguracion } from "../api/configuracion";
import VistaPreviaCotizacion from "../coomponents/VistaPreviaCotizacion";

export default function Cotizaciones() {
  const [configuracion, setConfiguracion] = useState(null);
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState("");
  const token = localStorage.getItem("token");
  const [numeroCotizacion] = useState(() => `COT-${Date.now()}`);
  const [showPreview, setShowPreview] = useState(false);
  const [cotizacionPreview, setCotizacionPreview] = useState(null);

  // margen fijo oculto
  // const margen = 30;
  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
    getConfiguracion().then(setConfiguracion);
  }, []);

  // Recibe: costo_material del producto, lista de adicionales, y la configuración global
  const calcularPrecio = (costo_material, adicionales, configuracion) => {
    // Paso 1: aplicar costo indirecto
    const costoParcial1 = costo_material * (1 + configuracion.costo_indirecto);

    // Paso 2: aplicar porcentaje administrativo
    const costoParcial2 =
      costoParcial1 * (1 + configuracion.porcentaje_administrativo);

    // Paso 3: aplicar rentabilidad
    const precioBase = costoParcial2 * (1 + configuracion.rentabilidad);

    // Paso 4: sumar adicionales seleccionados
    const sumaAdicionales = adicionales
      .filter((a) => a.seleccionado)
      .reduce((acc, a) => acc + Number(a.precio || 0), 0);

    // Precio final
    return precioBase + sumaAdicionales;
  };

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
        productoBase: producto.precio_final,
        costo_material: producto.costo_material,
        precio: producto.precio_final,
        cantidad: 1,
        subtotal: producto.precio_final,
        adicionales:
          producto.adicionales?.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            seleccionado: false,
            precio: a.precio,
          })) || [],
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
      clienteId,
      usuarioId: user.id,
      items: items.map((i) => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
        costo_material: i.costo_material,
        adicionales: i.adicionales
          .filter((a) => a.seleccionado)
          .map((a) => ({ id: a.id, precio: a.precio, seleccionado: true })),
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

  const toggleAdicional = (idx, j, checked) => {
    const nuevos = [...items];
    nuevos[idx].adicionales[j].seleccionado = checked;
    const adicionalesSeleccionados = nuevos[idx].adicionales
      .filter((a) => a.seleccionado)
      .reduce((acc, a) => acc + Number(a.precio), 0);
    nuevos[idx].precio = nuevos[idx].productoBase + adicionalesSeleccionados;
    nuevos[idx].subtotal = nuevos[idx].precio * nuevos[idx].cantidad;
    setItems(nuevos);
  };

  const itemsPreview = items.map((i) => {
    const precioFinal = calcularPrecio(
      i.costo_material,
      i.adicionales,
      configuracion
    );
    const subtotal = precioFinal * i.cantidad;
    return { ...i, precio: precioFinal, subtotal };
  });

  const abrirVistaPrevia = () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona cliente y productos");
      return;
    }
    const itemsPreview = items.map((i) => {
      const precioFinal = calcularPrecio(
        i.costo_material,
        i.adicionales,
        configuracion
      );
      const subtotal = precioFinal * i.cantidad;
      return { ...i, precio: precioFinal, subtotal };
    });
    const totalPreview = itemsPreview.reduce((s, i) => s + i.subtotal, 0);
    const data = {
      numero: numeroCotizacion,
      cliente: clientes.find((c) => c.id === clienteId),
      createdAt: new Date(),
      estado: "PENDIENTE",
      total: totalPreview,
      items: itemsPreview.map((i) => ({
        id: i.productoId,
        producto: { material: i.material },
        cantidad: i.cantidad,
        precio: i.precio,
        subtotal: i.subtotal,
      })),
    };
    setCotizacionPreview(data);
    setShowPreview(true);
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
      {showPreview && (
        <VistaPreviaCotizacion
          cotizacion={cotizacionPreview}
          onConfirm={guardarCotizacion}
          onCancel={() => setShowPreview(false)}
        />
      )}
      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Unidad</th>
            <th>Material</th>
            <th>Precio Final</th>
            <th>Cant.</th>
            <th>Subtotal</th>
            <th>Descripción</th>
            <th>Adicionales</th>
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
              <td>
                {/* Glosa compacta */}
                {i.material}{" "}
                {i.adicionales.map((a) =>
                  a.seleccionado ? `con ${a.nombre} ` : `sin ${a.nombre} `
                )}
              </td>
              <td>
                {/* Checkboxes de adicionales */}
                {i.adicionales.map((a, j) => (
                  <label key={a.id} style={{ display: "block" }}>
                    {" "}
                    <input
                      type="checkbox"
                      checked={a.seleccionado}
                      onChange={(e) =>
                        toggleAdicional(idx, j, e.target.checked)
                      }
                    />{" "}
                    {a.nombre} (S/. {a.precio}){" "}
                  </label>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totales */}
      <h3>Total: S/ {total.toFixed(2)}</h3>
      <button className="btn-primary" onClick={abrirVistaPrevia}>
        {" "}
        Vista Previa{" "}
      </button>
      <button className="btn-primary" onClick={guardarCotizacion}>
        {" "}
        Guardar y PDF{" "}
      </button>
    </div>
  );
}
