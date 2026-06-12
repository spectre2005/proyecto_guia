import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import clienteAxios from "../../config/axios";

const moneda = (valor) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor || 0));

const fecha = (valor) =>
    valor
        ? new Intl.DateTimeFormat("es-PE", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(valor))
        : "-";

const normalizar = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const VentasPanel = () => {
    const location = useLocation();
    const usuario = JSON.parse(localStorage.getItem("usuario")) || {};
    const esAdministrador = usuario.role?.nombre === "Administrador";
    const vista = location.pathname.includes("/listado")
        ? "listado"
        : location.pathname.includes("/comprobantes")
          ? "comprobantes"
          : "registrar";

    const [productos, setProductos] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [carrito, setCarrito] = useState([]);
    const [tipoComprobante, setTipoComprobante] = useState("boleta");
    const [metodoPago, setMetodoPago] = useState("efectivo");
    const [montoRecibido, setMontoRecibido] = useState("");
    const [busquedaHistorial, setBusquedaHistorial] = useState("");
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [ultimaVenta, setUltimaVenta] = useState(null);
    const [detalleAbierto, setDetalleAbierto] = useState(null);

    const cargarDatos = async () => {
        setCargando(true);
        setError("");

        try {
            const [respuestaProductos, respuestaVentas] = await Promise.all([
                clienteAxios.get("/productos"),
                clienteAxios.get("/ventas"),
            ]);

            setProductos(respuestaProductos.data.data || respuestaProductos.data);
            setVentas(respuestaVentas.data.data || respuestaVentas.data);
        } catch (peticionError) {
            setError(
                peticionError.response?.data?.message ||
                    "No se pudo cargar el módulo de ventas."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        Promise.all([
            clienteAxios.get("/productos"),
            clienteAxios.get("/ventas"),
        ])
            .then(([respuestaProductos, respuestaVentas]) => {
                    if (!activo) return;
                    setProductos(
                        respuestaProductos.data.data || respuestaProductos.data
                    );
                    setVentas(respuestaVentas.data.data || respuestaVentas.data);
                })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo cargar el módulo de ventas."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const variantes = useMemo(
        () =>
            productos.flatMap((producto) =>
                (producto.stocks || []).map((stock) => ({
                    id: stock.id,
                    codigo: stock.codigo,
                    nombre: producto.nombre,
                    marca: producto.marca?.nombre || "",
                    categoria: producto.categoria?.nombre || "",
                    imagen: producto.imagen,
                    talla: stock.talla?.nombre || "Única",
                    color: stock.color?.nombre || "Sin color",
                    precio: Number(stock.precio),
                    stock: Number(stock.cantidad),
                }))
            ),
        [productos]
    );

    const resultados = useMemo(() => {
        const texto = normalizar(busqueda.trim());
        if (!texto) return [];

        return variantes
            .filter(
                (item) =>
                    item.stock > 0 &&
                    normalizar(
                        `${item.codigo} ${item.nombre} ${item.marca} ${item.categoria}`
                    ).includes(texto)
            )
            .slice(0, 12);
    }, [busqueda, variantes]);

    const total = carrito.reduce(
        (acumulado, item) => acumulado + item.precio * item.cantidad,
        0
    );
    const efectivo = Number(montoRecibido || 0);
    const vuelto =
        metodoPago === "efectivo" ? Math.max(0, efectivo - total) : 0;

    const agregarProducto = (variante) => {
        const existente = carrito.find((item) => item.id === variante.id);

        if (existente && existente.cantidad >= variante.stock) {
            setMensaje("No hay más stock disponible para esa variante.");
            return;
        }

        setCarrito((actual) => {
            if (existente) {
                return actual.map((item) =>
                    item.id === variante.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }

            return [...actual, { ...variante, cantidad: 1 }];
        });
        setBusqueda("");
        setMensaje("");
    };

    const cambiarCantidad = (id, cantidad) => {
        setCarrito((actual) =>
            actual.map((item) =>
                item.id === id
                    ? {
                          ...item,
                          cantidad: Math.min(
                              item.stock,
                              Math.max(1, Number(cantidad) || 1)
                          ),
                      }
                    : item
            )
        );
    };

    const realizarVenta = async () => {
        if (!carrito.length) {
            setMensaje("Agrega al menos un producto.");
            return;
        }
        if (!usuario.id) {
            setMensaje("No se pudo identificar al vendedor.");
            return;
        }
        if (metodoPago === "efectivo" && efectivo < total) {
            setMensaje("El efectivo recibido es menor al total.");
            return;
        }
        setProcesando(true);
        setMensaje("");

        try {
            const { data } = await clienteAxios.post("/ventas", {
                clientes_id: null,
                usuarios_id: usuario.id,
                fecha: new Date().toISOString(),
                metodo_pago: metodoPago,
                monto_recibido:
                    metodoPago === "efectivo" ? efectivo : total,
                detalles: carrito.map((item) => ({
                    stocks_id: item.id,
                    cantidad: item.cantidad,
                })),
                comprobante: {
                    tipo: tipoComprobante,
                },
            });

            const venta = data.data;
            setCarrito([]);
            setMontoRecibido("");
            setUltimaVenta(venta);
            setMensaje(
                `Venta realizada. Comprobante ${venta.comprobante?.numero}.`
            );
            await cargarDatos();
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setMensaje(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo registrar la venta."
            );
        } finally {
            setProcesando(false);
        }
    };

    const ventasFiltradas = useMemo(() => {
        const texto = normalizar(busquedaHistorial.trim());
        return ventas.filter((venta) => {
            if (!texto) return true;
            return normalizar(
                `${venta.id} ${venta.comprobante?.numero} ${venta.metodo_pago}`
            ).includes(texto);
        });
    }, [busquedaHistorial, ventas]);

    const abrirComprobante = (ventaId) => {
        window.open(`/panel/comprobante-venta/${ventaId}`, "_blank");
    };

    const generarComprobante = async (venta) => {
        setMensaje("");

        try {
            await clienteAxios.post("/comprobantes", {
                ventas_id: venta.id,
                tipo: "ticket",
                fecha: venta.fecha,
            });
            await cargarDatos();
            setMensaje(`Comprobante generado para la venta #${venta.id}.`);
        } catch (peticionError) {
            setMensaje(
                peticionError.response?.data?.message ||
                    "No se pudo generar el comprobante."
            );
        }
    };

    const anularVenta = async (venta) => {
        if (
            !confirm(
                `¿Anular la venta #${venta.id}? El stock será restaurado.`
            )
        ) {
            return;
        }

        setMensaje("");

        try {
            await clienteAxios.delete(`/ventas/${venta.id}`);
            setDetalleAbierto(null);
            await cargarDatos();
            setMensaje("Venta anulada y stock restaurado.");
        } catch (peticionError) {
            setMensaje(
                peticionError.response?.data?.message ||
                    "No se pudo anular la venta."
            );
        }
    };

    if (vista !== "registrar") {
        const soloComprobantes =
            vista === "comprobantes"
                ? ventasFiltradas.filter((venta) => venta.comprobante)
                : ventasFiltradas;

        return (
            <div>
                <h2 className="text-4xl font-bold text-blue-950">
                    {vista === "comprobantes"
                        ? "Comprobantes de venta"
                        : "Listado de ventas"}
                </h2>
                <p className="mt-2 text-slate-600">
                    Consulta ventas anteriores y abre su comprobante en PDF.
                </p>
                {mensaje && (
                    <div className="mt-5 rounded-lg bg-blue-100 px-4 py-3 text-blue-800">
                        {mensaje}
                    </div>
                )}
                <section className="mt-6 rounded-2xl bg-white p-5 shadow">
                    <label className="block">
                        <span className="mb-1 block font-semibold">
                            Buscar por comprobante, pago o número de venta
                        </span>
                        <input
                            type="search"
                            value={busquedaHistorial}
                            onChange={(e) =>
                                setBusquedaHistorial(e.target.value)
                            }
                            className="w-full rounded-lg border px-4 py-3"
                            placeholder="Ejemplo: B001-00000001, efectivo o venta 15"
                        />
                    </label>
                </section>

                <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-900px text-left">
                            <thead className="bg-blue-950 text-white">
                                <tr>
                                    <th className="p-4">Venta</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Comprobante</th>
                                    <th className="p-4">Pago</th>
                                    <th className="p-4">Total</th>
                                    <th className="p-4">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {soloComprobantes.map((venta) => (
                                    <Fragment key={venta.id}>
                                    <tr>
                                        <td className="p-4 font-bold">
                                            #{venta.id}
                                        </td>
                                        <td className="p-4">{fecha(venta.fecha)}</td>
                                        <td className="p-4">
                                            {venta.comprobante?.numero ||
                                                "Sin comprobante"}
                                        </td>
                                        <td className="p-4 capitalize">
                                            {venta.metodo_pago}
                                        </td>
                                        <td className="p-4 font-bold text-green-700">
                                            {moneda(venta.total)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDetalleAbierto(
                                                            detalleAbierto ===
                                                                venta.id
                                                                ? null
                                                                : venta.id
                                                        )
                                                    }
                                                    className="rounded-lg bg-slate-600 px-3 py-2 font-bold text-white"
                                                >
                                                    Detalle
                                                </button>
                                                {venta.comprobante ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        abrirComprobante(venta.id)
                                                    }
                                                    className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white"
                                                >
                                                    Ver PDF
                                                </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            generarComprobante(
                                                                venta
                                                            )
                                                        }
                                                        className="rounded-lg bg-green-700 px-3 py-2 font-bold text-white"
                                                    >
                                                        Generar comprobante
                                                    </button>
                                                )}
                                                {esAdministrador && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            anularVenta(venta)
                                                        }
                                                        className="rounded-lg bg-red-600 px-3 py-2 font-bold text-white"
                                                    >
                                                        Anular
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                    {detalleAbierto === venta.id && (
                                        <tr>
                                            <td
                                                colSpan="6"
                                                className="bg-slate-50 p-4"
                                            >
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr>
                                                                <th className="p-2 text-left">
                                                                    Producto
                                                                </th>
                                                                <th className="p-2">
                                                                    Código
                                                                </th>
                                                                <th className="p-2">
                                                                    Cantidad
                                                                </th>
                                                                <th className="p-2">
                                                                    Precio
                                                                </th>
                                                                <th className="p-2">
                                                                    Importe
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(
                                                                venta.detalles ||
                                                                []
                                                            ).map((item) => (
                                                                <tr
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className="border-t"
                                                                >
                                                                    <td className="p-2 font-semibold">
                                                                        {item
                                                                            .stock
                                                                            ?.producto
                                                                            ?.nombre ||
                                                                            "Producto"}
                                                                    </td>
                                                                    <td className="p-2 text-center">
                                                                        {item
                                                                            .stock
                                                                            ?.codigo ||
                                                                            "-"}
                                                                    </td>
                                                                    <td className="p-2 text-center">
                                                                        {
                                                                            item.cantidad
                                                                        }
                                                                    </td>
                                                                    <td className="p-2 text-center">
                                                                        {moneda(
                                                                            item.precio_unitario
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2 text-center font-bold">
                                                                        {moneda(
                                                                            item.subtotal
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!cargando && !soloComprobantes.length && (
                        <p className="p-10 text-center text-slate-500">
                            No se encontraron registros.
                        </p>
                    )}
                </section>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-4xl font-bold text-blue-950">
                Punto de venta
            </h2>
            <p className="mt-2 text-slate-600">
                Busca por nombre o código, cobra y genera el comprobante.
            </p>
            {mensaje && (
                <div className="mt-5 rounded-lg bg-blue-100 px-4 py-3 text-blue-800">
                    {mensaje}
                </div>
            )}
            {ultimaVenta && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-green-900">
                    <div>
                        <p className="font-bold">Venta registrada correctamente</p>
                        <p className="text-sm">
                            {ultimaVenta.comprobante?.numero} por{" "}
                            {moneda(ultimaVenta.total)}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => abrirComprobante(ultimaVenta.id)}
                        className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white"
                    >
                        Ver comprobante
                    </button>
                </div>
            )}
            {error && (
                <div className="mt-5 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                    {error}
                </div>
            )}

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="min-w-0 rounded-2xl bg-white p-5 shadow">
                    <h3 className="text-xl font-bold text-blue-950">
                        1. Buscar productos
                    </h3>
                    <label className="relative mt-4 block">
                        <span className="mb-1 block font-semibold">
                            Nombre o código del producto
                        </span>
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Ejemplo: polo Nike o código 36997730"
                            autoFocus
                            className="w-full rounded-lg border-2 border-blue-200 px-4 py-3 outline-none focus:border-blue-700"
                        />
                        {busqueda && (
                            <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border bg-white shadow-xl">
                                {resultados.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => agregarProducto(item)}
                                        className="flex w-full items-center justify-between gap-4 border-b p-3 text-left hover:bg-blue-50"
                                    >
                                        <span>
                                            <strong>{item.nombre}</strong>
                                            <span className="block text-sm text-slate-500">
                                                Código: {item.codigo} |{" "}
                                                {item.talla} | {item.color}
                                            </span>
                                        </span>
                                        <span className="text-right">
                                            <strong>{moneda(item.precio)}</strong>
                                            <span className="block text-xs text-green-700">
                                                Stock: {item.stock}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                                {!resultados.length && (
                                    <p className="p-5 text-center text-slate-500">
                                        No hay productos disponibles.
                                    </p>
                                )}
                            </div>
                        )}
                    </label>

                    <div className="mt-6 flex items-end justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-blue-950">
                                2. Productos de la venta
                            </h3>
                            <p className="text-sm text-slate-500">
                                Ajusta las cantidades antes de cobrar.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCarrito([])}
                            disabled={!carrito.length}
                            className="rounded-lg bg-red-500 px-4 py-2 font-bold text-white disabled:opacity-40"
                        >
                            Vaciar lista
                        </button>
                    </div>

                    <div className="mt-4 overflow-x-auto rounded-lg border">
                        <table className="w-full min-w-850px">
                            <thead className="bg-cyan-700 text-white">
                                <tr>
                                    <th className="p-3 text-left">Código</th>
                                    <th className="p-3 text-left">Producto</th>
                                    <th className="p-3">Talla / color</th>
                                    <th className="p-3">Cantidad</th>
                                    <th className="p-3">Precio</th>
                                    <th className="p-3">Total</th>
                                    <th className="p-3">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {carrito.map((item) => (
                                    <tr key={item.id}>
                                        <td className="p-3">{item.codigo}</td>
                                        <td className="p-3 font-bold">
                                            {item.nombre}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.talla} / {item.color}
                                        </td>
                                        <td className="p-3 text-center">
                                            <input
                                                type="number"
                                                min="1"
                                                max={item.stock}
                                                value={item.cantidad}
                                                onChange={(e) =>
                                                    cambiarCantidad(
                                                        item.id,
                                                        e.target.value
                                                    )
                                                }
                                                className="w-20 rounded border px-2 py-2 text-center"
                                            />
                                            <span className="ml-2 text-xs text-slate-500">
                                                / {item.stock}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {moneda(item.precio)}
                                        </td>
                                        <td className="p-3 text-center font-bold">
                                            {moneda(
                                                item.precio * item.cantidad
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCarrito((actual) =>
                                                        actual.filter(
                                                            (producto) =>
                                                                producto.id !==
                                                                item.id
                                                        )
                                                    )
                                                }
                                                className="rounded bg-red-500 px-3 py-2 font-bold text-white"
                                            >
                                                Quitar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!carrito.length && (
                            <p className="p-10 text-center text-slate-500">
                                Busca un producto y selecciónalo para agregarlo.
                            </p>
                        )}
                    </div>
                </section>

                <aside className="h-fit rounded-2xl bg-white p-5 shadow">
                    <h3 className="text-xl font-bold text-blue-950">
                        3. Datos y cobro
                    </h3>

                    <label className="mt-4 block">
                        <span className="mb-1 block font-semibold">
                            Tipo de comprobante
                        </span>
                        <select
                            value={tipoComprobante}
                            onChange={(e) =>
                                setTipoComprobante(e.target.value)
                            }
                            className="w-full rounded-lg border px-3 py-3"
                        >
                            <option value="boleta">Boleta</option>
                            <option value="ticket">Ticket</option>
                        </select>
                    </label>

                    <label className="mt-4 block">
                        <span className="mb-1 block font-semibold">
                            Método de pago
                        </span>
                        <select
                            value={metodoPago}
                            onChange={(e) => setMetodoPago(e.target.value)}
                            className="w-full rounded-lg border px-3 py-3"
                        >
                            <option value="efectivo">Efectivo</option>
                            <option value="yape">Yape</option>
                            <option value="tarjeta">Tarjeta</option>
                            <option value="transferencia">Transferencia</option>
                        </select>
                    </label>

                    {metodoPago === "efectivo" && (
                        <label className="mt-4 block">
                            <span className="mb-1 block font-semibold">
                                Efectivo recibido
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="0.10"
                                value={montoRecibido}
                                onChange={(e) =>
                                    setMontoRecibido(e.target.value)
                                }
                                className="w-full rounded-lg border px-3 py-3"
                            />
                        </label>
                    )}

                    <div className="mt-6 space-y-3 border-t pt-5">
                        <div className="flex justify-between">
                            <span>Productos</span>
                            <strong>
                                {carrito.reduce(
                                    (cantidad, item) =>
                                        cantidad + item.cantidad,
                                    0
                                )}
                            </strong>
                        </div>
                        {metodoPago === "efectivo" && (
                            <div className="flex justify-between text-orange-700">
                                <span>Vuelto</span>
                                <strong>{moneda(vuelto)}</strong>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-4 text-2xl text-blue-950">
                            <span className="font-bold">TOTAL</span>
                            <strong>{moneda(total)}</strong>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={realizarVenta}
                        disabled={procesando || !carrito.length}
                        className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-4 text-lg font-black text-white hover:bg-blue-800 disabled:opacity-40"
                    >
                        {procesando ? "Procesando..." : "Realizar venta"}
                    </button>
                    <p className="mt-3 text-center text-xs text-slate-500">
                        Al finalizar se abrirá el comprobante para imprimir o guardar como PDF.
                    </p>
                </aside>
            </div>
        </div>
    );
};

export default VentasPanel;
