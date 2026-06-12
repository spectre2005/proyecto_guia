import { useEffect, useMemo, useState } from "react";
import clienteAxios from "../../config/axios";

const proveedorVacio = {
    nombre_empresa: "",
    contacto: "",
    ruc: "",
    telefono: "",
    email: "",
    direccion: "",
    dias_credito: "0",
    estado: "1",
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

const ProveedoresPanel = () => {
    const [proveedores, setProveedores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState("todos");
    const [modalProveedor, setModalProveedor] = useState(false);
    const [proveedorEditando, setProveedorEditando] = useState(null);
    const [form, setForm] = useState(proveedorVacio);
    const [guardando, setGuardando] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const cargarProveedores = async () => {
        setCargando(true);
        setError("");

        try {
            const { data } = await clienteAxios.get("/proveedores");
            setProveedores(Array.isArray(data) ? data : data.data || []);
        } catch (peticionError) {
            setError(
                peticionError.response?.data?.message ||
                    "No se pudieron cargar los proveedores."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/proveedores")
            .then(({ data }) => {
                if (activo) {
                    setProveedores(
                        Array.isArray(data) ? data : data.data || []
                    );
                }
            })
            .catch((peticionError) => {
                if (activo) {
                    setError(
                        peticionError.response?.data?.message ||
                            "No se pudieron cargar los proveedores."
                    );
                }
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const resumen = useMemo(() => {
        const comprado = proveedores.reduce(
            (suma, proveedor) =>
                suma + Number(proveedor.total_comprado || 0),
            0
        );
        const pagado = proveedores.reduce(
            (suma, proveedor) =>
                suma + Number(proveedor.total_pagado || 0),
            0
        );

        return {
            total: proveedores.length,
            activos: proveedores.filter(
                (proveedor) => Number(proveedor.estado) === 1
            ).length,
            comprado,
            deuda: Math.max(0, comprado - pagado),
        };
    }, [proveedores]);

    const proveedoresFiltrados = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return proveedores
            .filter((proveedor) => {
                const deuda = Number(proveedor.saldo_pendiente || 0);
                const activo = Number(proveedor.estado) === 1;
                const coincideFiltro =
                    filtro === "todos" ||
                    (filtro === "deuda" && deuda > 0) ||
                    (filtro === "activos" && activo) ||
                    (filtro === "inactivos" && !activo);
                const coincideTexto =
                    !texto ||
                    [
                        proveedor.nombre_empresa,
                        proveedor.contacto,
                        proveedor.ruc,
                        proveedor.telefono,
                        proveedor.email,
                    ].some((campo) => normalizar(campo).includes(texto));

                return coincideFiltro && coincideTexto;
            })
            .sort((a, b) =>
                a.nombre_empresa.localeCompare(b.nombre_empresa, "es", {
                    sensitivity: "base",
                })
            );
    }, [busqueda, filtro, proveedores]);

    const abrirNuevo = () => {
        setProveedorEditando(null);
        setForm({ ...proveedorVacio });
        setMensaje("");
        setModalProveedor(true);
    };

    const abrirEdicion = (proveedor) => {
        setProveedorEditando(proveedor);
        setForm({
            nombre_empresa: proveedor.nombre_empresa || "",
            contacto: proveedor.contacto || "",
            ruc: proveedor.ruc || "",
            telefono: proveedor.telefono || "",
            email: proveedor.email || "",
            direccion: proveedor.direccion || "",
            dias_credito: String(proveedor.dias_credito ?? 0),
            estado: String(Number(proveedor.estado ?? 1)),
        });
        setMensaje("");
        setModalProveedor(true);
    };

    const guardarProveedor = async (evento) => {
        evento.preventDefault();
        setGuardando(true);
        setMensaje("");

        try {
            const datos = {
                ...form,
                notas: proveedorEditando?.notas || null,
            };

            if (proveedorEditando) {
                await clienteAxios.put(
                    `/proveedores/${proveedorEditando.id}`,
                    datos
                );
            } else {
                await clienteAxios.post("/proveedores", datos);
            }

            setModalProveedor(false);
            await cargarProveedores();
            setMensaje(
                proveedorEditando
                    ? "Proveedor actualizado correctamente."
                    : "Proveedor registrado correctamente."
            );
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setMensaje(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo guardar el proveedor."
            );
        } finally {
            setGuardando(false);
        }
    };

    const eliminarProveedor = async (proveedor) => {
        if (
            !confirm(
                `¿Eliminar al proveedor ${proveedor.nombre_empresa}?`
            )
        ) {
            return;
        }

        try {
            await clienteAxios.delete(`/proveedores/${proveedor.id}`);
            await cargarProveedores();
            setMensaje("Proveedor eliminado correctamente.");
        } catch (peticionError) {
            setMensaje(
                peticionError.response?.data?.message ||
                    "No se pudo eliminar el proveedor."
            );
        }
    };

    const abrirDetalle = async (proveedor) => {
        setDetalle(proveedor);
        setCargandoDetalle(true);

        try {
            const { data } = await clienteAxios.get(
                `/proveedores/${proveedor.id}`
            );
            setDetalle(data.data || data);
        } catch (peticionError) {
            setDetalle(null);
            setMensaje(
                peticionError.response?.data?.message ||
                    "No se pudo cargar el proveedor."
            );
        } finally {
            setCargandoDetalle(false);
        }
    };

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Proveedores
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Administra los datos de contacto y consulta el estado comercial.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirNuevo}
                    className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white"
                >
                    + Nuevo proveedor
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
                    ["Proveedores", resumen.total, "bg-blue-700"],
                    ["Proveedores activos", resumen.activos, "bg-cyan-700"],
                    ["Total comprado", moneda(resumen.comprado), "bg-violet-700"],
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
                    Buscar proveedores
                </h3>
                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(evento) => setBusqueda(evento.target.value)}
                        placeholder="Empresa, contacto, RUC, teléfono o correo..."
                        className="rounded-lg border px-4 py-3"
                    />
                    <select
                        value={filtro}
                        onChange={(evento) => setFiltro(evento.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todos">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="deuda">Con deuda</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
            </section>

            <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-1050px text-left">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Contacto</th>
                                <th className="p-4">Compras</th>
                                <th className="p-4">Total comprado</th>
                                <th className="p-4">Deuda</th>
                                <th className="p-4">Última compra</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {proveedoresFiltrados.map((proveedor) => (
                                <tr key={proveedor.id}>
                                    <td className="p-4">
                                        <p className="font-bold">
                                            {proveedor.nombre_empresa}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                            RUC: {proveedor.ruc || "-"}
                                        </p>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <p>
                                            {proveedor.contacto ||
                                                "Sin contacto"}
                                        </p>
                                        <p className="text-slate-500">
                                            {proveedor.telefono ||
                                                proveedor.email ||
                                                "-"}
                                        </p>
                                    </td>
                                    <td className="p-4 text-center font-bold">
                                        {proveedor.compras_count || 0}
                                    </td>
                                    <td className="p-4 font-semibold">
                                        {moneda(proveedor.total_comprado)}
                                    </td>
                                    <td className="p-4 font-bold text-orange-700">
                                        {moneda(proveedor.saldo_pendiente)}
                                    </td>
                                    <td className="p-4">
                                        {fecha(proveedor.ultima_compra)}
                                    </td>
                                    <td className="p-4">
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                Number(proveedor.estado) === 1
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-slate-200 text-slate-600"
                                            }`}
                                        >
                                            {Number(proveedor.estado) === 1
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirDetalle(proveedor)
                                                }
                                                className="rounded bg-blue-700 px-3 py-2 font-bold text-white"
                                            >
                                                Ver
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirEdicion(proveedor)
                                                }
                                                className="rounded bg-yellow-400 px-3 py-2 font-bold text-blue-950"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    eliminarProveedor(proveedor)
                                                }
                                                className="rounded bg-red-500 px-3 py-2 font-bold text-white"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!cargando && !proveedoresFiltrados.length && (
                    <p className="p-10 text-center text-slate-500">
                        No hay proveedores para mostrar.
                    </p>
                )}
            </section>

            {modalProveedor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-950">
                                    {proveedorEditando
                                        ? "Editar proveedor"
                                        : "Nuevo proveedor"}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Ingresa los datos comerciales y de contacto.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setModalProveedor(false)}
                                className="text-2xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={guardarProveedor}
                            className="mt-6 grid gap-4 md:grid-cols-2"
                        >
                            {[
                                ["nombre_empresa", "Empresa", "text", true],
                                ["contacto", "Persona de contacto", "text", false],
                                ["ruc", "RUC", "text", false],
                                ["telefono", "Teléfono", "tel", false],
                                ["email", "Correo", "email", false],
                                [
                                    "dias_credito",
                                    "Días de crédito",
                                    "number",
                                    false,
                                ],
                            ].map(([campo, etiqueta, tipo, requerido]) => (
                                <label key={campo}>
                                    <span className="mb-1 block font-semibold">
                                        {etiqueta}
                                    </span>
                                    <input
                                        type={tipo}
                                        value={form[campo]}
                                        onChange={(evento) =>
                                            setForm({
                                                ...form,
                                                [campo]: evento.target.value,
                                            })
                                        }
                                        required={requerido}
                                        min={
                                            tipo === "number" ? "0" : undefined
                                        }
                                        maxLength={
                                            campo === "ruc" ? 11 : undefined
                                        }
                                        className="w-full rounded-lg border px-4 py-3"
                                    />
                                </label>
                            ))}
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Estado
                                </span>
                                <select
                                    value={form.estado}
                                    onChange={(evento) =>
                                        setForm({
                                            ...form,
                                            estado: evento.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border px-4 py-3"
                                >
                                    <option value="1">Activo</option>
                                    <option value="0">Inactivo</option>
                                </select>
                            </label>
                            <label className="md:col-span-2">
                                <span className="mb-1 block font-semibold">
                                    Dirección
                                </span>
                                <input
                                    value={form.direccion}
                                    onChange={(evento) =>
                                        setForm({
                                            ...form,
                                            direccion: evento.target.value,
                                        })
                                    }
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </label>
                            <div className="flex justify-end gap-3 md:col-span-2">
                                <button
                                    type="button"
                                    onClick={() => setModalProveedor(false)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={guardando}
                                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white disabled:opacity-50"
                                >
                                    {guardando ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {detalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-2xl font-bold text-blue-950">
                                    {detalle.nombre_empresa}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Ficha e historial del proveedor
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

                        {cargandoDetalle ? (
                            <p className="py-12 text-center text-slate-500">
                                Cargando proveedor...
                            </p>
                        ) : (
                            <>
                                <div className="mt-5 grid gap-4 md:grid-cols-3">
                                    <article className="rounded-xl bg-slate-100 p-4 md:col-span-2">
                                        <p>
                                            <strong>Contacto:</strong>{" "}
                                            {detalle.contacto || "-"}
                                        </p>
                                        <p>
                                            <strong>RUC:</strong>{" "}
                                            {detalle.ruc || "-"}
                                        </p>
                                        <p>
                                            <strong>Teléfono:</strong>{" "}
                                            {detalle.telefono || "-"}
                                        </p>
                                        <p>
                                            <strong>Correo:</strong>{" "}
                                            {detalle.email || "-"}
                                        </p>
                                        <p>
                                            <strong>Dirección:</strong>{" "}
                                            {detalle.direccion || "-"}
                                        </p>
                                        <p>
                                            <strong>Crédito:</strong>{" "}
                                            {detalle.dias_credito || 0} días
                                        </p>
                                    </article>
                                    <article className="rounded-xl bg-blue-950 p-4 text-white">
                                        <p className="text-sm text-blue-200">
                                            Estado comercial
                                        </p>
                                        <p className="mt-2 text-2xl font-black">
                                            {moneda(detalle.saldo_pendiente)}
                                        </p>
                                        <p className="mt-1 text-sm">
                                            deuda pendiente
                                        </p>
                                        <p className="mt-3 text-sm text-blue-200">
                                            Comprado:{" "}
                                            {moneda(detalle.total_comprado)}
                                        </p>
                                        <p className="text-sm text-blue-200">
                                            Pagado:{" "}
                                            {moneda(detalle.total_pagado)}
                                        </p>
                                    </article>
                                </div>

                                <h4 className="mt-7 text-xl font-bold text-blue-950">
                                    Historial de compras
                                </h4>
                                <div className="mt-3 overflow-x-auto rounded-lg border">
                                    <table className="w-full min-w-700px">
                                        <thead className="bg-blue-950 text-white">
                                            <tr>
                                                <th className="p-3">Compra</th>
                                                <th className="p-3">Fecha</th>
                                                <th className="p-3">Documento</th>
                                                <th className="p-3">Total</th>
                                                <th className="p-3">Pagado</th>
                                                <th className="p-3">Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(detalle.compras || []).map(
                                                (compra) => {
                                                    const saldo = Math.max(
                                                        0,
                                                        Number(compra.total) -
                                                            Number(
                                                                compra.monto_pagado
                                                            )
                                                    );

                                                    return (
                                                        <tr key={compra.id}>
                                                            <td className="p-3 text-center font-bold">
                                                                #{compra.id}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {fecha(
                                                                    compra.fecha
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center">
                                                                {compra.numero_documento ||
                                                                    "-"}
                                                            </td>
                                                            <td className="p-3 text-center font-semibold">
                                                                {moneda(
                                                                    compra.total
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center text-green-700">
                                                                {moneda(
                                                                    compra.monto_pagado
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-center font-bold text-orange-700">
                                                                {moneda(saldo)}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )}
                                        </tbody>
                                    </table>
                                    {!detalle.compras?.length && (
                                        <p className="p-8 text-center text-slate-500">
                                            Este proveedor todavía no tiene compras.
                                        </p>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProveedoresPanel;
