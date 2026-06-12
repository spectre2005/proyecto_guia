import { useEffect, useMemo, useState } from "react";
import clienteAxios from "../../config/axios";

const hoy = new Date().toISOString().slice(0, 10);
const porPagina = 20;

const normalizar = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const fechaHora = (valor) =>
    valor
        ? new Intl.DateTimeFormat("es-PE", {
              dateStyle: "medium",
              timeStyle: "short",
          }).format(new Date(valor))
        : "-";

const nombreUsuario = (auditoria) => {
    const persona = auditoria.usuario?.persona;

    return (
        [persona?.nombre, persona?.apellido].filter(Boolean).join(" ") ||
        auditoria.usuario?.username ||
        "Usuario no disponible"
    );
};

const nombreModulo = (modulo) => {
    const nombres = {
        productos: "Productos",
        stocks: "Stock",
        categorias: "Categorías",
        marcas: "Marcas",
        materiales: "Materiales",
        tallas: "Tallas",
        colores: "Colores",
        clientes: "Clientes",
        usuarios: "Usuarios",
        proveedores: "Proveedores",
        compras: "Compras",
        ventas: "Ventas",
        comprobantes: "Comprobantes",
        carritos: "Carritos",
        "carrito-detalles": "Detalle de carrito",
        "compra-detalles": "Detalle de compra",
        "venta-detalles": "Detalle de venta",
        "mi-carrito": "Tienda / carrito",
        "mi-compra": "Tienda / compra",
        "mi-cuenta": "Cuenta de usuario",
    };

    return nombres[modulo] || modulo || "Sistema";
};

const estiloAccion = (accion) => {
    const valor = normalizar(accion);

    if (valor.includes("eliminar")) return "bg-red-100 text-red-700";
    if (valor.includes("actualizar")) return "bg-amber-100 text-amber-700";
    if (valor.includes("pago")) return "bg-violet-100 text-violet-700";
    if (valor.includes("stock")) return "bg-cyan-100 text-cyan-700";
    if (valor.includes("crear") || valor.includes("finalizar")) {
        return "bg-green-100 text-green-700";
    }

    return "bg-slate-100 text-slate-700";
};

const AuditoriasPanel = () => {
    const [auditorias, setAuditorias] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [accion, setAccion] = useState("todas");
    const [modulo, setModulo] = useState("todos");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [pagina, setPagina] = useState(1);
    const [detalle, setDetalle] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargarAuditorias = async () => {
        setCargando(true);
        setError("");

        try {
            const { data } = await clienteAxios.get("/auditorias");
            setAuditorias(data.data || data);
        } catch (peticionError) {
            setError(
                peticionError.response?.data?.message ||
                    "No se pudo cargar el historial de auditoría."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/auditorias")
            .then(({ data }) => {
                if (activo) setAuditorias(data.data || data);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo cargar el historial de auditoría."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const acciones = useMemo(
        () =>
            [...new Set(auditorias.map((item) => item.accion).filter(Boolean))]
                .sort((a, b) => a.localeCompare(b, "es")),
        [auditorias]
    );

    const modulos = useMemo(
        () =>
            [
                ...new Set(
                    auditorias
                        .map((item) => item.tabla_afectada)
                        .filter(Boolean)
                ),
            ].sort((a, b) =>
                nombreModulo(a).localeCompare(nombreModulo(b), "es")
            ),
        [auditorias]
    );

    const auditoriasFiltradas = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return auditorias.filter((item) => {
            const dia = item.fecha
                ? new Date(item.fecha).toISOString().slice(0, 10)
                : "";
            const contenido = normalizar(
                `${item.id} ${item.accion} ${item.tabla_afectada} ${
                    item.registro_id
                } ${item.descripcion} ${item.ip} ${nombreUsuario(item)} ${
                    item.usuario?.username
                }`
            );

            return (
                (accion === "todas" || item.accion === accion) &&
                (modulo === "todos" || item.tabla_afectada === modulo) &&
                (!fechaInicio || dia >= fechaInicio) &&
                (!fechaFin || dia <= fechaFin) &&
                (!texto || contenido.includes(texto))
            );
        });
    }, [
        accion,
        auditorias,
        busqueda,
        fechaFin,
        fechaInicio,
        modulo,
    ]);

    const totalPaginas = Math.max(
        1,
        Math.ceil(auditoriasFiltradas.length / porPagina)
    );
    const paginaActual = Math.min(pagina, totalPaginas);
    const auditoriasPagina = auditoriasFiltradas.slice(
        (paginaActual - 1) * porPagina,
        paginaActual * porPagina
    );

    const resumen = useMemo(() => {
        const hoyTotal = auditorias.filter(
            (item) =>
                item.fecha &&
                new Date(item.fecha).toISOString().slice(0, 10) === hoy
        ).length;
        const usuarios = new Set(
            auditorias.map((item) => item.usuarios_id).filter(Boolean)
        );
        const eliminaciones = auditorias.filter((item) =>
            normalizar(item.accion).includes("eliminar")
        ).length;

        return {
            total: auditorias.length,
            hoy: hoyTotal,
            usuarios: usuarios.size,
            eliminaciones,
        };
    }, [auditorias]);

    const limpiarFiltros = () => {
        setBusqueda("");
        setAccion("todas");
        setModulo("todos");
        setFechaInicio("");
        setFechaFin("");
        setPagina(1);
    };

    const exportarCsv = () => {
        const filas = auditoriasFiltradas.map((item) => [
            item.id,
            fechaHora(item.fecha),
            item.accion,
            nombreModulo(item.tabla_afectada),
            item.registro_id || "",
            nombreUsuario(item),
            item.usuario?.role?.nombre || "",
            item.ip || "",
            item.descripcion || "",
        ]);
        const contenido = [
            [
                "ID",
                "Fecha",
                "Acción",
                "Módulo",
                "Registro",
                "Usuario",
                "Rol",
                "IP",
                "Descripción",
            ],
            ...filas,
        ]
            .map((fila) =>
                fila
                    .map(
                        (celda) =>
                            `"${String(celda).replaceAll('"', '""')}"`
                    )
                    .join(",")
            )
            .join("\n");
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(
            new Blob(["\uFEFF", contenido], {
                type: "text/csv;charset=utf-8",
            })
        );
        enlace.download = `auditoria-${hoy}.csv`;
        enlace.click();
        URL.revokeObjectURL(enlace.href);
    };

    const cambiarFiltro = (actualizar, valor) => {
        actualizar(valor);
        setPagina(1);
    };

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Auditoría del sistema
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Revisa las operaciones realizadas por los usuarios.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={cargarAuditorias}
                        className="rounded-lg bg-slate-600 px-4 py-3 font-bold text-white"
                    >
                        Actualizar
                    </button>
                    <button
                        type="button"
                        onClick={exportarCsv}
                        disabled={!auditoriasFiltradas.length}
                        className="rounded-lg bg-green-700 px-4 py-3 font-bold text-white disabled:opacity-40"
                    >
                        Exportar CSV
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-5 rounded-lg bg-red-100 p-4 text-red-700">
                    {error}
                </div>
            )}

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                    ["Eventos registrados", resumen.total, "border-blue-700"],
                    ["Acciones de hoy", resumen.hoy, "border-green-700"],
                    ["Usuarios activos", resumen.usuarios, "border-violet-700"],
                    [
                        "Eliminaciones",
                        resumen.eliminaciones,
                        "border-red-600",
                    ],
                ].map(([titulo, valor, color]) => (
                    <article
                        key={titulo}
                        className={`rounded-xl border-l-4 ${color} bg-white p-4 shadow-sm`}
                    >
                        <p className="text-sm text-slate-500">{titulo}</p>
                        <strong className="mt-1 block text-3xl text-blue-950">
                            {valor}
                        </strong>
                    </article>
                ))}
            </section>

            <section className="mt-6 rounded-xl bg-white p-5 shadow-sm">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(evento) =>
                            cambiarFiltro(setBusqueda, evento.target.value)
                        }
                        placeholder="Buscar usuario, acción, IP..."
                        className="rounded-lg border px-4 py-3"
                    />
                    <select
                        value={accion}
                        onChange={(evento) =>
                            cambiarFiltro(setAccion, evento.target.value)
                        }
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todas">Todas las acciones</option>
                        {acciones.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                    <select
                        value={modulo}
                        onChange={(evento) =>
                            cambiarFiltro(setModulo, evento.target.value)
                        }
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todos">Todos los módulos</option>
                        {modulos.map((item) => (
                            <option key={item} value={item}>
                                {nombreModulo(item)}
                            </option>
                        ))}
                    </select>
                    <input
                        type="date"
                        value={fechaInicio}
                        title="Fecha inicial"
                        onChange={(evento) =>
                            cambiarFiltro(setFechaInicio, evento.target.value)
                        }
                        className="rounded-lg border px-4 py-3"
                    />
                    <input
                        type="date"
                        value={fechaFin}
                        title="Fecha final"
                        onChange={(evento) =>
                            cambiarFiltro(setFechaFin, evento.target.value)
                        }
                        className="rounded-lg border px-4 py-3"
                    />
                </div>
                <button
                    type="button"
                    onClick={limpiarFiltros}
                    className="mt-3 text-sm font-bold text-blue-800"
                >
                    Limpiar filtros
                </button>
            </section>

            <section className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b px-5 py-3 text-sm text-slate-600">
                    {auditoriasFiltradas.length} eventos encontrados
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px]">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-3">Fecha</th>
                                <th className="p-3 text-left">Usuario</th>
                                <th className="p-3">Acción</th>
                                <th className="p-3 text-left">Módulo</th>
                                <th className="p-3">Registro</th>
                                <th className="p-3 text-left">Descripción</th>
                                <th className="p-3">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {auditoriasPagina.map((item) => (
                                <tr key={item.id}>
                                    <td className="p-3 text-center text-sm">
                                        {fechaHora(item.fecha)}
                                    </td>
                                    <td className="p-3">
                                        <span className="font-semibold">
                                            {nombreUsuario(item)}
                                        </span>
                                        <span className="block text-xs text-slate-500">
                                            {item.usuario?.role?.nombre ||
                                                "Sin rol"}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <span
                                            className={`rounded-full px-3 py-1 text-sm font-bold ${estiloAccion(
                                                item.accion
                                            )}`}
                                        >
                                            {item.accion}
                                        </span>
                                    </td>
                                    <td className="p-3 font-semibold">
                                        {nombreModulo(item.tabla_afectada)}
                                    </td>
                                    <td className="p-3 text-center">
                                        {item.registro_id
                                            ? `#${item.registro_id}`
                                            : "-"}
                                    </td>
                                    <td className="max-w-sm truncate p-3 text-sm text-slate-600">
                                        {item.descripcion || "-"}
                                    </td>
                                    <td className="p-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => setDetalle(item)}
                                            className="rounded bg-blue-700 px-3 py-2 text-sm font-bold text-white"
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {cargando && (
                    <p className="p-8 text-center text-slate-500">
                        Cargando auditorías...
                    </p>
                )}
                {!cargando && !auditoriasPagina.length && (
                    <p className="p-8 text-center text-slate-500">
                        Todavía no hay acciones que coincidan con los filtros.
                    </p>
                )}

                {auditoriasFiltradas.length > porPagina && (
                    <div className="flex items-center justify-between border-t p-4">
                        <button
                            type="button"
                            disabled={paginaActual === 1}
                            onClick={() => setPagina(paginaActual - 1)}
                            className="rounded bg-slate-200 px-4 py-2 font-bold disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="text-sm">
                            Página {paginaActual} de {totalPaginas}
                        </span>
                        <button
                            type="button"
                            disabled={paginaActual === totalPaginas}
                            onClick={() => setPagina(paginaActual + 1)}
                            className="rounded bg-slate-200 px-4 py-2 font-bold disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </section>

            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-950">
                                    Detalle de auditoría
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Evento #{detalle.id}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetalle(null)}
                                className="text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>
                        <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Fecha
                                </dt>
                                <dd className="font-semibold">
                                    {fechaHora(detalle.fecha)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Usuario
                                </dt>
                                <dd className="font-semibold">
                                    {nombreUsuario(detalle)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Acción
                                </dt>
                                <dd className="font-semibold">
                                    {detalle.accion}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Módulo
                                </dt>
                                <dd className="font-semibold">
                                    {nombreModulo(detalle.tabla_afectada)}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Registro afectado
                                </dt>
                                <dd className="font-semibold">
                                    {detalle.registro_id
                                        ? `#${detalle.registro_id}`
                                        : "-"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-sm text-slate-500">
                                    Dirección IP
                                </dt>
                                <dd className="font-semibold">
                                    {detalle.ip || "-"}
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm text-slate-500">
                                    Descripción
                                </dt>
                                <dd className="mt-1 font-semibold">
                                    {detalle.descripcion ||
                                        "Sin descripción adicional."}
                                </dd>
                            </div>
                        </dl>
                        <div className="mt-5 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setDetalle(null)}
                                className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditoriasPanel;
