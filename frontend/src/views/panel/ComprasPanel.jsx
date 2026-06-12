import { useEffect, useMemo, useState } from "react";
import clienteAxios from "../../config/axios";

const hoy = () => new Date().toISOString().slice(0, 10);

const compraInicial = {
    proveedores_id: "",
    fecha: hoy(),
    numero_documento: "",
    fecha_vencimiento: "",
    pago_inicial: "0",
    metodo_pago: "efectivo",
};

const itemInicial = {
    productos_id: "",
    stocks_id: "",
    cantidad: "1",
    precio: "",
};

const pagoInicial = {
    fecha: new Date().toISOString().slice(0, 16),
    monto: "",
    metodo: "efectivo",
    referencia: "",
};

const moneda = (valor) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor || 0));

const fecha = (valor) =>
    valor
        ? new Intl.DateTimeFormat("es-PE", {
              dateStyle: "medium",
          }).format(new Date(`${String(valor).slice(0, 10)}T12:00:00`))
        : "-";

const normalizar = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const ComprasPanel = () => {
    const usuario = JSON.parse(localStorage.getItem("usuario")) || {};
    const [compras, setCompras] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState("todas");
    const [modalCompra, setModalCompra] = useState(false);
    const [formCompra, setFormCompra] = useState(compraInicial);
    const [formItem, setFormItem] = useState(itemInicial);
    const [items, setItems] = useState([]);
    const [detalle, setDetalle] = useState(null);
    const [modalPago, setModalPago] = useState(null);
    const [formPago, setFormPago] = useState(pagoInicial);
    const [guardando, setGuardando] = useState(false);

    const cargarDatos = async () => {
        setCargando(true);
        setError("");

        try {
            const [respuestaCompras, respuestaProveedores, respuestaProductos] =
                await Promise.all([
                    clienteAxios.get("/compras"),
                    clienteAxios.get("/proveedores"),
                    clienteAxios.get("/productos"),
                ]);

            setCompras(respuestaCompras.data.data || respuestaCompras.data);
            setProveedores(
                respuestaProveedores.data.data || respuestaProveedores.data
            );
            setProductos(
                respuestaProductos.data.data || respuestaProductos.data
            );
        } catch (peticionError) {
            setError(
                peticionError.response?.data?.message ||
                    "No se pudo cargar el módulo de compras."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        Promise.all([
            clienteAxios.get("/compras"),
            clienteAxios.get("/proveedores"),
            clienteAxios.get("/productos"),
        ])
            .then(
                ([
                    respuestaCompras,
                    respuestaProveedores,
                    respuestaProductos,
                ]) => {
                    if (!activo) return;
                    setCompras(
                        respuestaCompras.data.data || respuestaCompras.data
                    );
                    setProveedores(
                        respuestaProveedores.data.data ||
                            respuestaProveedores.data
                    );
                    setProductos(
                        respuestaProductos.data.data || respuestaProductos.data
                    );
                }
            )
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo cargar el módulo de compras."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const resumen = useMemo(() => {
        const total = compras.reduce(
            (suma, compra) => suma + Number(compra.total || 0),
            0
        );
        const pagado = compras.reduce(
            (suma, compra) => suma + Number(compra.monto_pagado || 0),
            0
        );

        return {
            cantidad: compras.length,
            total,
            pagado,
            deuda: Math.max(0, total - pagado),
        };
    }, [compras]);

    const comprasFiltradas = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return compras.filter((compra) => {
            const saldo =
                Number(compra.total || 0) -
                Number(compra.monto_pagado || 0);
            const coincideFiltro =
                filtro === "todas" ||
                (filtro === "pendientes" && saldo > 0) ||
                (filtro === "pagadas" && saldo <= 0);
            const productosCompra = (compra.detalles || [])
                .map((item) => item.producto?.nombre)
                .join(" ");
            const coincideTexto =
                !texto ||
                normalizar(
                    `${compra.id} ${compra.numero_documento} ${compra.proveedor?.nombre_empresa} ${productosCompra}`
                ).includes(texto);

            return coincideFiltro && coincideTexto;
        });
    }, [busqueda, compras, filtro]);

    const abrirNuevaCompra = () => {
        setFormCompra({ ...compraInicial, fecha: hoy() });
        setFormItem({ ...itemInicial });
        setItems([]);
        setMensaje("");
        setModalCompra(true);
    };

    const seleccionarProveedor = (proveedorId) => {
        const proveedor = proveedores.find(
            (item) => String(item.id) === String(proveedorId)
        );
        const fechaCompra = formCompra.fecha || hoy();
        let vencimiento = "";

        if (proveedor && Number(proveedor.dias_credito) > 0) {
            const valor = new Date(`${fechaCompra}T12:00:00`);
            valor.setDate(valor.getDate() + Number(proveedor.dias_credito));
            vencimiento = valor.toISOString().slice(0, 10);
        }

        setFormCompra({
            ...formCompra,
            proveedores_id: proveedorId,
            fecha_vencimiento: vencimiento,
        });
    };

    const productoSeleccionado = productos.find(
        (producto) =>
            String(producto.id) === String(formItem.productos_id)
    );
    const variantes = productoSeleccionado?.stocks || [];

    const agregarItem = () => {
        if (
            !formItem.productos_id ||
            !formItem.stocks_id ||
            Number(formItem.cantidad) < 1 ||
            formItem.precio === "" ||
            Number(formItem.precio) < 0
        ) {
            setMensaje(
                "Completa producto, talla/color, cantidad y costo unitario."
            );
            return;
        }

        if (
            items.some(
                (item) => String(item.stocks_id) === String(formItem.stocks_id)
            )
        ) {
            setMensaje("Esa variante ya está agregada.");
            return;
        }

        const stock = variantes.find(
            (item) => String(item.id) === String(formItem.stocks_id)
        );

        setItems((actuales) => [
            ...actuales,
            {
                ...formItem,
                nombre: productoSeleccionado?.nombre || "Producto",
                variante:
                    [stock?.talla?.nombre, stock?.color?.nombre]
                        .filter(Boolean)
                        .join(" / ") || "General",
                subtotal:
                    Number(formItem.cantidad) * Number(formItem.precio),
            },
        ]);
        setFormItem({ ...itemInicial });
        setMensaje("");
    };

    const totalCompra = items.reduce(
        (suma, item) => suma + Number(item.subtotal || 0),
        0
    );

    const guardarCompra = async (evento) => {
        evento.preventDefault();

        if (!items.length) {
            setMensaje("Agrega al menos un producto.");
            return;
        }
        if (Number(formCompra.pago_inicial || 0) > totalCompra) {
            setMensaje("El pago inicial no puede superar el total.");
            return;
        }

        setGuardando(true);
        setMensaje("");

        try {
            await clienteAxios.post("/compras", {
                ...formCompra,
                usuarios_id: usuario.id,
                detalles: items.map((item) => ({
                    productos_id: item.productos_id,
                    stocks_id: item.stocks_id,
                    cantidad: Number(item.cantidad),
                    precio: Number(item.precio),
                })),
            });
            setModalCompra(false);
            await cargarDatos();
            setMensaje("Compra registrada y stock actualizado.");
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setMensaje(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo registrar la compra."
            );
        } finally {
            setGuardando(false);
        }
    };

    const abrirPago = (compra) => {
        const saldo =
            Number(compra.total || 0) -
            Number(compra.monto_pagado || 0);
        setModalPago(compra);
        setFormPago({
            ...pagoInicial,
            fecha: new Date().toISOString().slice(0, 16),
            monto: String(Math.max(0, saldo)),
        });
        setMensaje("");
    };

    const registrarPago = async (evento) => {
        evento.preventDefault();
        setGuardando(true);

        try {
            await clienteAxios.post(
                `/proveedores/${modalPago.proveedores_id}/pagos`,
                {
                    compras_id: modalPago.id,
                    usuarios_id: usuario.id,
                    fecha: formPago.fecha.replace("T", " "),
                    monto: Number(formPago.monto),
                    metodo: formPago.metodo,
                    referencia: formPago.referencia || null,
                }
            );
            setModalPago(null);
            await cargarDatos();
            setMensaje("Pago registrado correctamente.");
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setMensaje(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo registrar el pago."
            );
        } finally {
            setGuardando(false);
        }
    };

    const anularCompra = async (compra) => {
        if (
            !confirm(
                `¿Anular la compra #${compra.id}? Se descontará del stock recibido.`
            )
        ) {
            return;
        }

        try {
            await clienteAxios.delete(`/compras/${compra.id}`);
            setDetalle(null);
            await cargarDatos();
            setMensaje("Compra anulada correctamente.");
        } catch (peticionError) {
            setMensaje(
                peticionError.response?.data?.message ||
                    "No se pudo anular la compra."
            );
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Compras
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Registra mercadería, controla pagos y actualiza el stock.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirNuevaCompra}
                    className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white"
                >
                    + Registrar compra
                </button>
            </div>

            {mensaje && (
                <div className="mt-5 rounded-lg bg-blue-100 px-4 py-3 text-blue-800">
                    {mensaje}
                </div>
            )}
            {error && (
                <div className="mt-5 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                    {error}
                </div>
            )}

            <section className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    ["Compras registradas", resumen.cantidad, "bg-blue-700"],
                    ["Total comprado", moneda(resumen.total), "bg-violet-700"],
                    ["Total pagado", moneda(resumen.pagado), "bg-green-700"],
                    ["Deuda pendiente", moneda(resumen.deuda), "bg-orange-600"],
                ].map(([titulo, valor, color]) => (
                    <article
                        key={titulo}
                        className={`${color} rounded-2xl p-5 text-white shadow`}
                    >
                        <p className="text-sm font-semibold text-white/80">
                            {titulo}
                        </p>
                        <p className="mt-2 text-3xl font-black">{valor}</p>
                    </article>
                ))}
            </section>

            <section className="mt-7 rounded-2xl bg-white p-5 shadow">
                <h3 className="text-xl font-bold text-blue-950">
                    Buscar compras
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(evento) => setBusqueda(evento.target.value)}
                        placeholder="Proveedor, documento, producto o número..."
                        className="rounded-lg border px-4 py-3"
                    />
                    <select
                        value={filtro}
                        onChange={(evento) => setFiltro(evento.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todas">Todas</option>
                        <option value="pendientes">Con deuda</option>
                        <option value="pagadas">Pagadas</option>
                    </select>
                </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-1050px text-left">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-4">Compra</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Documento</th>
                                <th className="p-4">Fecha</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Pagado</th>
                                <th className="p-4">Saldo</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {comprasFiltradas.map((compra) => {
                                const saldo = Math.max(
                                    0,
                                    Number(compra.total) -
                                        Number(compra.monto_pagado)
                                );

                                return (
                                    <tr key={compra.id}>
                                        <td className="p-4 font-bold">
                                            #{compra.id}
                                        </td>
                                        <td className="p-4 font-semibold">
                                            {compra.proveedor?.nombre_empresa}
                                        </td>
                                        <td className="p-4">
                                            {compra.numero_documento || "-"}
                                        </td>
                                        <td className="p-4">
                                            {fecha(compra.fecha)}
                                        </td>
                                        <td className="p-4 font-bold">
                                            {moneda(compra.total)}
                                        </td>
                                        <td className="p-4 text-green-700">
                                            {moneda(compra.monto_pagado)}
                                        </td>
                                        <td className="p-4">
                                            <span
                                                className={`rounded-full px-3 py-1 font-bold ${
                                                    saldo > 0
                                                        ? "bg-orange-100 text-orange-700"
                                                        : "bg-green-100 text-green-700"
                                                }`}
                                            >
                                                {moneda(saldo)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDetalle(compra)
                                                    }
                                                    className="rounded bg-slate-600 px-3 py-2 font-bold text-white"
                                                >
                                                    Ver
                                                </button>
                                                {saldo > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            abrirPago(compra)
                                                        }
                                                        className="rounded bg-green-700 px-3 py-2 font-bold text-white"
                                                    >
                                                        Pagar
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        anularCompra(compra)
                                                    }
                                                    className="rounded bg-red-600 px-3 py-2 font-bold text-white"
                                                >
                                                    Anular
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {!cargando && !comprasFiltradas.length && (
                    <p className="p-10 text-center text-slate-500">
                        No hay compras para mostrar.
                    </p>
                )}
            </section>

            {modalCompra && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white p-6">
                        <div className="flex justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-950">
                                    Registrar compra
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Los productos agregados aumentarán el stock.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalCompra(false)}
                                className="text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={guardarCompra} className="mt-6">
                            <h4 className="text-lg font-bold text-blue-950">
                                1. Datos de la compra
                            </h4>
                            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Proveedor
                                    </span>
                                    <select
                                        value={formCompra.proveedores_id}
                                        onChange={(evento) =>
                                            seleccionarProveedor(
                                                evento.target.value
                                            )
                                        }
                                        required
                                        className="w-full rounded-lg border px-3 py-3"
                                    >
                                        <option value="">
                                            Selecciona proveedor
                                        </option>
                                        {proveedores
                                            .filter(
                                                (proveedor) =>
                                                    Number(
                                                        proveedor.estado ?? 1
                                                    ) === 1
                                            )
                                            .map((proveedor) => (
                                                <option
                                                    key={proveedor.id}
                                                    value={proveedor.id}
                                                >
                                                    {
                                                        proveedor.nombre_empresa
                                                    }
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Fecha
                                    </span>
                                    <input
                                        type="date"
                                        value={formCompra.fecha}
                                        onChange={(evento) =>
                                            setFormCompra({
                                                ...formCompra,
                                                fecha: evento.target.value,
                                            })
                                        }
                                        required
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Factura o documento
                                    </span>
                                    <input
                                        value={formCompra.numero_documento}
                                        onChange={(evento) =>
                                            setFormCompra({
                                                ...formCompra,
                                                numero_documento:
                                                    evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Vencimiento
                                    </span>
                                    <input
                                        type="date"
                                        value={formCompra.fecha_vencimiento}
                                        onChange={(evento) =>
                                            setFormCompra({
                                                ...formCompra,
                                                fecha_vencimiento:
                                                    evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Pago inicial
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formCompra.pago_inicial}
                                        onChange={(evento) =>
                                            setFormCompra({
                                                ...formCompra,
                                                pago_inicial:
                                                    evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                            </div>

                            <h4 className="mt-7 text-lg font-bold text-blue-950">
                                2. Productos recibidos
                            </h4>
                            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                                <label className="xl:col-span-2">
                                    <span className="mb-1 block font-semibold">
                                        Producto
                                    </span>
                                    <select
                                        value={formItem.productos_id}
                                        onChange={(evento) => {
                                            const producto = productos.find(
                                                (item) =>
                                                    String(item.id) ===
                                                    evento.target.value
                                            );
                                            const stocks =
                                                producto?.stocks || [];
                                            setFormItem({
                                                ...formItem,
                                                productos_id:
                                                    evento.target.value,
                                                stocks_id:
                                                    stocks.length === 1
                                                        ? String(stocks[0].id)
                                                        : "",
                                            });
                                        }}
                                        className="w-full rounded-lg border px-3 py-3"
                                    >
                                        <option value="">
                                            Selecciona producto
                                        </option>
                                        {productos
                                            .filter(
                                                (producto) =>
                                                    (producto.stocks || [])
                                                        .length > 0
                                            )
                                            .map((producto) => (
                                                <option
                                                    key={producto.id}
                                                    value={producto.id}
                                                >
                                                    {producto.nombre}
                                                </option>
                                            ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Talla / color
                                    </span>
                                    <select
                                        value={formItem.stocks_id}
                                        onChange={(evento) =>
                                            setFormItem({
                                                ...formItem,
                                                stocks_id:
                                                    evento.target.value,
                                            })
                                        }
                                        disabled={!formItem.productos_id}
                                        className="w-full rounded-lg border px-3 py-3 disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            Selecciona variante
                                        </option>
                                        {variantes.map((stock) => (
                                            <option
                                                key={stock.id}
                                                value={stock.id}
                                            >
                                                {[
                                                    stock.talla?.nombre,
                                                    stock.color?.nombre,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" / ") || "General"}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Cantidad
                                    </span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={formItem.cantidad}
                                        onChange={(evento) =>
                                            setFormItem({
                                                ...formItem,
                                                cantidad: evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Costo unitario
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formItem.precio}
                                        onChange={(evento) =>
                                            setFormItem({
                                                ...formItem,
                                                precio: evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    />
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={agregarItem}
                                className="mt-3 rounded-lg bg-cyan-700 px-4 py-2 font-bold text-white"
                            >
                                + Agregar producto
                            </button>

                            <div className="mt-4 overflow-x-auto rounded-lg border">
                                <table className="w-full">
                                    <thead className="bg-blue-950 text-white">
                                        <tr>
                                            <th className="p-3 text-left">
                                                Producto
                                            </th>
                                            <th className="p-3">Variante</th>
                                            <th className="p-3">Cantidad</th>
                                            <th className="p-3">Costo</th>
                                            <th className="p-3">Subtotal</th>
                                            <th className="p-3">Acción</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {items.map((item) => (
                                            <tr key={item.stocks_id}>
                                                <td className="p-3 font-semibold">
                                                    {item.nombre}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {item.variante}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {item.cantidad}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {moneda(item.precio)}
                                                </td>
                                                <td className="p-3 text-center font-bold">
                                                    {moneda(item.subtotal)}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setItems(
                                                                (
                                                                    actuales
                                                                ) =>
                                                                    actuales.filter(
                                                                        (
                                                                            actual
                                                                        ) =>
                                                                            actual.stocks_id !==
                                                                            item.stocks_id
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
                            </div>

                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                <label>
                                    <span className="mb-1 block font-semibold">
                                        Método del pago inicial
                                    </span>
                                    <select
                                        value={formCompra.metodo_pago}
                                        onChange={(evento) =>
                                            setFormCompra({
                                                ...formCompra,
                                                metodo_pago:
                                                    evento.target.value,
                                            })
                                        }
                                        className="w-full rounded-lg border px-3 py-3"
                                    >
                                        <option value="efectivo">
                                            Efectivo
                                        </option>
                                        <option value="transferencia">
                                            Transferencia
                                        </option>
                                        <option value="yape">Yape</option>
                                        <option value="tarjeta">Tarjeta</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </label>
                                <div className="rounded-xl bg-slate-100 p-4 text-right">
                                    <span>Total de compra</span>
                                    <p className="text-3xl font-black text-blue-950">
                                        {moneda(totalCompra)}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModalCompra(false)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={guardando}
                                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white disabled:opacity-50"
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : "Registrar compra"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6">
                        <div className="flex justify-between">
                            <h3 className="text-2xl font-bold text-blue-950">
                                Compra #{detalle.id}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setDetalle(null)}
                                className="text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <div className="mt-5 grid gap-3 rounded-xl bg-slate-100 p-4 md:grid-cols-2">
                            <p>
                                <strong>Proveedor:</strong>{" "}
                                {detalle.proveedor?.nombre_empresa}
                            </p>
                            <p>
                                <strong>Documento:</strong>{" "}
                                {detalle.numero_documento || "-"}
                            </p>
                            <p>
                                <strong>Fecha:</strong> {fecha(detalle.fecha)}
                            </p>
                            <p>
                                <strong>Vencimiento:</strong>{" "}
                                {fecha(detalle.fecha_vencimiento)}
                            </p>
                        </div>
                        <div className="mt-5 overflow-x-auto rounded-lg border">
                            <table className="w-full">
                                <thead className="bg-blue-950 text-white">
                                    <tr>
                                        <th className="p-3 text-left">
                                            Producto
                                        </th>
                                        <th className="p-3">Variante</th>
                                        <th className="p-3">Cantidad</th>
                                        <th className="p-3">Costo</th>
                                        <th className="p-3">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(detalle.detalles || []).map((item) => (
                                        <tr key={item.id}>
                                            <td className="p-3 font-semibold">
                                                {item.producto?.nombre}
                                            </td>
                                            <td className="p-3 text-center">
                                                {[
                                                    item.stock?.talla?.nombre,
                                                    item.stock?.color?.nombre,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" / ") || "-"}
                                            </td>
                                            <td className="p-3 text-center">
                                                {item.cantidad}
                                            </td>
                                            <td className="p-3 text-center">
                                                {moneda(item.precio)}
                                            </td>
                                            <td className="p-3 text-center font-bold">
                                                {moneda(item.subtotal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {modalPago && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-xl rounded-2xl bg-white p-6">
                        <h3 className="text-2xl font-bold text-blue-950">
                            Registrar pago
                        </h3>
                        <p className="mt-1 text-slate-500">
                            Compra #{modalPago.id} -{" "}
                            {modalPago.proveedor?.nombre_empresa}
                        </p>
                        <form
                            onSubmit={registrarPago}
                            className="mt-5 grid gap-4 md:grid-cols-2"
                        >
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Fecha
                                </span>
                                <input
                                    type="datetime-local"
                                    value={formPago.fecha}
                                    onChange={(evento) =>
                                        setFormPago({
                                            ...formPago,
                                            fecha: evento.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border px-3 py-3"
                                />
                            </label>
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Monto
                                </span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={formPago.monto}
                                    onChange={(evento) =>
                                        setFormPago({
                                            ...formPago,
                                            monto: evento.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border px-3 py-3"
                                />
                            </label>
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Método
                                </span>
                                <select
                                    value={formPago.metodo}
                                    onChange={(evento) =>
                                        setFormPago({
                                            ...formPago,
                                            metodo: evento.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border px-3 py-3"
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">
                                        Transferencia
                                    </option>
                                    <option value="yape">Yape</option>
                                    <option value="tarjeta">Tarjeta</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </label>
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Referencia opcional
                                </span>
                                <input
                                    value={formPago.referencia}
                                    onChange={(evento) =>
                                        setFormPago({
                                            ...formPago,
                                            referencia: evento.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border px-3 py-3"
                                />
                            </label>
                            <div className="flex justify-end gap-3 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setModalPago(null)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={guardando}
                                    className="rounded-lg bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50"
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : "Registrar pago"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComprasPanel;
