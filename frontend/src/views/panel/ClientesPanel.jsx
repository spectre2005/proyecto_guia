import { useEffect, useMemo, useState } from "react";
import clienteAxios from "../../config/axios";

const formularioVacio = {
    nombre: "",
    apellido: "",
    dni: "",
    telefono: "",
    direccion: "",
    email: "",
};

const moneda = (valor) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor || 0));

const fecha = (valor, incluirHora = false) => {
    if (!valor) return "Sin compras";

    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "medium",
        ...(incluirHora ? { timeStyle: "short" } : {}),
    }).format(new Date(valor));
};

const normalizar = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const ClientesPanel = () => {
    const [clientes, setClientes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtroCompras, setFiltroCompras] = useState("todos");
    const [filtroEstado, setFiltroEstado] = useState("todos");
    const [gastoMinimo, setGastoMinimo] = useState("");
    const [orden, setOrden] = useState("recientes");
    const [pagina, setPagina] = useState(1);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [editando, setEditando] = useState(null);
    const [form, setForm] = useState(formularioVacio);
    const [guardando, setGuardando] = useState(false);
    const [pedidoAbierto, setPedidoAbierto] = useState(null);
    const porPagina = 10;

    const cargarClientes = async () => {
        setCargando(true);
        setError("");

        try {
            const { data } = await clienteAxios.get("/clientes");
            setClientes(Array.isArray(data) ? data : data.data || []);
        } catch (errorPeticion) {
            setError(
                errorPeticion.response?.data?.message ||
                    "No se pudieron cargar los clientes."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/clientes")
            .then(({ data }) => {
                if (!activo) return;
                setClientes(Array.isArray(data) ? data : data.data || []);
            })
            .catch((errorPeticion) => {
                if (!activo) return;
                setError(
                    errorPeticion.response?.data?.message ||
                        "No se pudieron cargar los clientes."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const clientesFiltrados = useMemo(() => {
        const texto = normalizar(busqueda.trim());
        const minimo = Number(gastoMinimo || 0);

        return clientes
            .filter((cliente) => {
                const persona = cliente.persona || {};
                const usuario = persona.usuario;
                const coincideTexto =
                    !texto ||
                    [
                        persona.nombre,
                        persona.apellido,
                        persona.dni,
                        persona.telefono,
                        persona.email,
                        usuario?.username,
                    ].some((campo) => normalizar(campo).includes(texto));
                const compras = Number(cliente.ventas_count || 0);
                const coincideCompras =
                    filtroCompras === "todos" ||
                    (filtroCompras === "una" && compras === 1) ||
                    (filtroCompras === "recurrentes" && compras >= 2);
                const coincideEstado =
                    filtroEstado === "todos" ||
                    (filtroEstado === "activos" &&
                        Number(usuario?.estado) === 1) ||
                    (filtroEstado === "inactivos" &&
                        Number(usuario?.estado) === 0);

                return (
                    coincideTexto &&
                    coincideCompras &&
                    coincideEstado &&
                    Number(cliente.total_gastado || 0) >= minimo
                );
            })
            .sort((a, b) => {
                if (orden === "mayor-gasto") {
                    return (
                        Number(b.total_gastado || 0) -
                        Number(a.total_gastado || 0)
                    );
                }
                if (orden === "mas-compras") {
                    return (
                        Number(b.ventas_count || 0) -
                        Number(a.ventas_count || 0)
                    );
                }
                if (orden === "nombre") {
                    return `${a.persona?.nombre} ${a.persona?.apellido}`.localeCompare(
                        `${b.persona?.nombre} ${b.persona?.apellido}`,
                        "es",
                        { sensitivity: "base" }
                    );
                }

                return (
                    new Date(b.ultima_compra || 0) -
                    new Date(a.ultima_compra || 0)
                );
            });
    }, [
        busqueda,
        clientes,
        filtroCompras,
        filtroEstado,
        gastoMinimo,
        orden,
    ]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(clientesFiltrados.length / porPagina)
    );
    const paginaActual = Math.min(pagina, totalPaginas);
    const clientesPagina = clientesFiltrados.slice(
        (paginaActual - 1) * porPagina,
        paginaActual * porPagina
    );

    const resumen = useMemo(
        () => ({
            total: clientes.length,
            recurrentes: clientes.filter(
                (cliente) => Number(cliente.ventas_count || 0) >= 2
            ).length,
            ventas: clientes.reduce(
                (total, cliente) =>
                    total + Number(cliente.ventas_count || 0),
                0
            ),
            ingresos: clientes.reduce(
                (total, cliente) =>
                    total + Number(cliente.total_gastado || 0),
                0
            ),
        }),
        [clientes]
    );

    const abrirDetalle = async (cliente) => {
        setCargandoDetalle(true);
        setDetalle(cliente);
        setPedidoAbierto(null);

        try {
            const { data } = await clienteAxios.get(`/clientes/${cliente.id}`);
            setDetalle(data.data || data);
        } catch (errorPeticion) {
            setMensaje(
                errorPeticion.response?.data?.message ||
                    "No se pudo cargar el detalle."
            );
            setDetalle(null);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const abrirEdicion = (cliente) => {
        const persona = cliente.persona || {};
        setEditando(cliente);
        setForm({
            nombre: persona.nombre || "",
            apellido: persona.apellido || "",
            dni: persona.dni || "",
            telefono: persona.telefono || "",
            direccion: persona.direccion || "",
            email: persona.email || "",
        });
        setMensaje("");
    };

    const guardarCliente = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje("");

        try {
            await clienteAxios.put(`/clientes/${editando.id}`, form);
            await cargarClientes();
            setEditando(null);
            setMensaje("Datos del cliente actualizados correctamente.");
        } catch (errorPeticion) {
            const errores = errorPeticion.response?.data?.errors;
            setMensaje(
                (errores && Object.values(errores).flat()[0]) ||
                    errorPeticion.response?.data?.message ||
                    "No se pudo actualizar el cliente."
            );
        } finally {
            setGuardando(false);
        }
    };

    const eliminarCliente = async (cliente) => {
        const nombre = `${cliente.persona?.nombre || ""} ${
            cliente.persona?.apellido || ""
        }`.trim();

        if (
            !confirm(
                `¿Deseas eliminar el registro de cliente de ${nombre}?`
            )
        ) {
            return;
        }

        setMensaje("");

        try {
            await clienteAxios.delete(`/clientes/${cliente.id}`);
            await cargarClientes();
            setMensaje("Cliente eliminado correctamente.");
        } catch (errorPeticion) {
            setMensaje(
                errorPeticion.response?.data?.message ||
                    "No se pudo eliminar el cliente."
            );
        }
    };

    const exportarCsv = () => {
        const filas = clientesFiltrados.map((cliente) => {
            const persona = cliente.persona || {};
            return [
                cliente.id,
                `${persona.nombre || ""} ${persona.apellido || ""}`.trim(),
                persona.dni || "",
                persona.telefono || "",
                persona.email || "",
                persona.direccion || "",
                persona.usuario?.username || "",
                cliente.ventas_count || 0,
                Number(cliente.total_gastado || 0).toFixed(2),
                cliente.ultima_compra || "",
            ];
        });
        const contenido = [
            [
                "ID",
                "Cliente",
                "DNI",
                "Teléfono",
                "Correo",
                "Dirección",
                "Usuario",
                "Compras",
                "Total gastado",
                "Última compra",
            ],
            ...filas,
        ]
            .map((fila) =>
                fila
                    .map((celda) => `"${String(celda).replaceAll('"', '""')}"`)
                    .join(",")
            )
            .join("\n");
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(
            new Blob([`\uFEFF${contenido}`], {
                type: "text/csv;charset=utf-8",
            })
        );
        enlace.download = `clientes-${new Date()
            .toISOString()
            .slice(0, 10)}.csv`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
    };

    const limpiarFiltros = () => {
        setBusqueda("");
        setFiltroCompras("todos");
        setFiltroEstado("todos");
        setGastoMinimo("");
        setOrden("recientes");
    };

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Gestión de clientes
                    </h2>
                    <p className="mt-2 text-gray-600">
                        Clientes creados automáticamente después de su primera compra.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={exportarCsv}
                        disabled={!clientesFiltrados.length}
                        className="rounded-lg bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800 disabled:opacity-50"
                    >
                        Exportar CSV
                    </button>
                    <button
                        type="button"
                        onClick={cargarClientes}
                        disabled={cargando}
                        className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white hover:bg-blue-900 disabled:opacity-50"
                    >
                        {cargando ? "Actualizando..." : "Actualizar"}
                    </button>
                </div>
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

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                    ["Clientes compradores", resumen.total, "bg-blue-700"],
                    ["Clientes recurrentes", resumen.recurrentes, "bg-violet-700"],
                    ["Compras registradas", resumen.ventas, "bg-cyan-700"],
                    ["Ingresos de clientes", moneda(resumen.ingresos), "bg-green-700"],
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
            </div>

            <section className="mt-7 rounded-2xl bg-white p-5 shadow">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Nombre, DNI, correo, teléfono..."
                        className="rounded-lg border px-4 py-3 xl:col-span-2"
                    />
                    <select
                        value={filtroCompras}
                        onChange={(e) => setFiltroCompras(e.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todos">Todas las compras</option>
                        <option value="una">Una compra</option>
                        <option value="recurrentes">Recurrentes</option>
                    </select>
                    <select
                        value={filtroEstado}
                        onChange={(e) => setFiltroEstado(e.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="activos">Cuenta activa</option>
                        <option value="inactivos">Cuenta inactiva</option>
                    </select>
                    <input
                        type="number"
                        min="0"
                        value={gastoMinimo}
                        onChange={(e) => setGastoMinimo(e.target.value)}
                        placeholder="Gasto mínimo"
                        className="rounded-lg border px-4 py-3"
                    />
                    <select
                        value={orden}
                        onChange={(e) => setOrden(e.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="recientes">Compra más reciente</option>
                        <option value="mayor-gasto">Mayor gasto</option>
                        <option value="mas-compras">Más compras</option>
                        <option value="nombre">Nombre A-Z</option>
                    </select>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                        {clientesFiltrados.length} cliente(s) encontrados
                    </span>
                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="font-bold text-blue-800 hover:underline"
                    >
                        Limpiar filtros
                    </button>
                </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-1100px text-left">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Contacto</th>
                                <th className="p-4">Cuenta</th>
                                <th className="p-4 text-center">Compras</th>
                                <th className="p-4">Total gastado</th>
                                <th className="p-4">Última compra</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {clientesPagina.map((cliente) => {
                                const persona = cliente.persona || {};
                                const usuario = persona.usuario;

                                return (
                                    <tr
                                        key={cliente.id}
                                        className="hover:bg-slate-50"
                                    >
                                        <td className="p-4">
                                            <p className="font-bold text-slate-900">
                                                {persona.nombre} {persona.apellido}
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                DNI: {persona.dni || "No registrado"}
                                            </p>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <p>{persona.email || "Sin correo"}</p>
                                            <p className="text-slate-500">
                                                {persona.telefono || "Sin teléfono"}
                                            </p>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-semibold">
                                                {usuario?.username || "Sin usuario"}
                                            </p>
                                            <span
                                                className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-bold ${
                                                    Number(usuario?.estado) === 1
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-red-100 text-red-700"
                                                }`}
                                            >
                                                {Number(usuario?.estado) === 1
                                                    ? "Activo"
                                                    : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-lg font-bold">
                                            {cliente.ventas_count}
                                        </td>
                                        <td className="p-4 font-bold text-green-700">
                                            {moneda(cliente.total_gastado)}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {fecha(cliente.ultima_compra)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => abrirDetalle(cliente)}
                                                    className="rounded bg-blue-700 px-3 py-2 font-bold text-white hover:bg-blue-800"
                                                >
                                                    Ver
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => abrirEdicion(cliente)}
                                                    className="rounded bg-yellow-400 px-3 py-2 font-bold text-blue-950 hover:bg-yellow-500"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => eliminarCliente(cliente)}
                                                    className="rounded bg-red-500 px-3 py-2 font-bold text-white hover:bg-red-600"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!cargando && !clientesPagina.length && (
                    <p className="p-10 text-center text-slate-500">
                        No se encontraron clientes con esos filtros.
                    </p>
                )}

                <div className="flex items-center justify-between border-t px-5 py-4">
                    <span className="text-sm text-slate-500">
                        Página {paginaActual} de {totalPaginas}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setPagina(Math.max(1, paginaActual - 1))
                            }
                            disabled={paginaActual === 1}
                            className="rounded border px-4 py-2 font-semibold disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setPagina(
                                    Math.min(
                                        totalPaginas,
                                        paginaActual + 1
                                    )
                                )
                            }
                            disabled={paginaActual === totalPaginas}
                            className="rounded border px-4 py-2 font-semibold disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </section>

            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setDetalle(null)}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-red-500"
                        >
                            ×
                        </button>
                        <h3 className="text-2xl font-bold text-blue-950">
                            Ficha del cliente
                        </h3>

                        {cargandoDetalle ? (
                            <p className="py-12 text-center text-slate-500">
                                Cargando historial...
                            </p>
                        ) : (
                            <>
                                <div className="mt-5 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-xl bg-slate-100 p-4 md:col-span-2">
                                        <p className="text-xl font-bold">
                                            {detalle.persona?.nombre}{" "}
                                            {detalle.persona?.apellido}
                                        </p>
                                        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                                            <p>DNI: {detalle.persona?.dni || "-"}</p>
                                            <p>Teléfono: {detalle.persona?.telefono || "-"}</p>
                                            <p>Correo: {detalle.persona?.email || "-"}</p>
                                            <p>Usuario: {detalle.persona?.usuario?.username || "-"}</p>
                                            <p className="md:col-span-2">
                                                Dirección: {detalle.persona?.direccion || "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-blue-950 p-4 text-white">
                                        <p className="text-sm text-blue-200">Resumen</p>
                                        <p className="mt-2 text-3xl font-black">
                                            {moneda(detalle.total_gastado)}
                                        </p>
                                        <p className="mt-2">
                                            {detalle.ventas_count} compra(s)
                                        </p>
                                        <p className="mt-1 text-sm text-blue-200">
                                            Última: {fecha(detalle.ultima_compra)}
                                        </p>
                                    </div>
                                </div>

                                <h4 className="mt-7 text-xl font-bold text-blue-950">
                                    Historial de compras
                                </h4>
                                <div className="mt-3 space-y-3">
                                    {(detalle.ventas || []).map((venta) => (
                                        <article
                                            key={venta.id}
                                            className="overflow-hidden rounded-xl border"
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPedidoAbierto(
                                                        pedidoAbierto === venta.id
                                                            ? null
                                                            : venta.id
                                                    )
                                                }
                                                className="flex w-full items-center justify-between gap-4 bg-slate-50 p-4 text-left hover:bg-slate-100"
                                            >
                                                <span>
                                                    <strong>Venta #{venta.id}</strong>
                                                    <span className="ml-3 text-sm text-slate-500">
                                                        {fecha(venta.fecha, true)}
                                                    </span>
                                                </span>
                                                <span className="font-bold text-green-700">
                                                    {moneda(venta.total)}
                                                </span>
                                            </button>
                                            {pedidoAbierto === venta.id && (
                                                <div className="p-4">
                                                    <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-600">
                                                        <span>Pago: {venta.metodo_pago || "-"}</span>
                                                        <span>Estado: {venta.estado}</span>
                                                        <span>
                                                            Comprobante:{" "}
                                                            {venta.comprobante?.numero || "Sin comprobante"}
                                                        </span>
                                                    </div>
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-blue-950 text-white">
                                                                <tr>
                                                                    <th className="p-2 text-left">Producto</th>
                                                                    <th className="p-2">Talla</th>
                                                                    <th className="p-2">Color</th>
                                                                    <th className="p-2">Cantidad</th>
                                                                    <th className="p-2">Subtotal</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {(venta.detalles || []).map((item) => (
                                                                    <tr key={item.id}>
                                                                        <td className="p-2 font-semibold">
                                                                            {item.stock?.producto?.nombre || "Producto"}
                                                                        </td>
                                                                        <td className="p-2 text-center">
                                                                            {item.stock?.talla?.nombre || "-"}
                                                                        </td>
                                                                        <td className="p-2 text-center">
                                                                            {item.stock?.color?.nombre || "-"}
                                                                        </td>
                                                                        <td className="p-2 text-center">
                                                                            {item.cantidad}
                                                                        </td>
                                                                        <td className="p-2 text-center font-semibold">
                                                                            {moneda(item.subtotal)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {editando && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setEditando(null)}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-red-500"
                        >
                            ×
                        </button>
                        <h3 className="text-2xl font-bold text-blue-950">
                            Editar cliente
                        </h3>
                        <form
                            onSubmit={guardarCliente}
                            className="mt-5 grid gap-4 md:grid-cols-2"
                        >
                            {[
                                ["nombre", "Nombre", "text"],
                                ["apellido", "Apellido", "text"],
                                ["dni", "DNI", "text"],
                                ["telefono", "Teléfono", "tel"],
                                ["email", "Correo electrónico", "email"],
                            ].map(([campo, etiqueta, tipo]) => (
                                <label key={campo} className="block">
                                    <span className="mb-1 block font-semibold">
                                        {etiqueta}
                                    </span>
                                    <input
                                        type={tipo}
                                        value={form[campo]}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                [campo]: e.target.value,
                                            })
                                        }
                                        required={
                                            campo === "nombre" ||
                                            campo === "apellido"
                                        }
                                        maxLength={campo === "dni" ? 8 : undefined}
                                        className="w-full rounded-lg border px-4 py-3"
                                    />
                                </label>
                            ))}
                            <label className="block md:col-span-2">
                                <span className="mb-1 block font-semibold">
                                    Dirección
                                </span>
                                <textarea
                                    value={form.direccion}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            direccion: e.target.value,
                                        })
                                    }
                                    rows="3"
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </label>
                            <div className="flex justify-end gap-3 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setEditando(null)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardando}
                                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white disabled:opacity-50"
                                >
                                    {guardando ? "Guardando..." : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientesPanel;
