import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const hoy = new Date().toISOString().slice(0, 10);
const inicioMes = `${hoy.slice(0, 8)}01`;

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

const ReportesCompras = () => {
    const [periodo, setPeriodo] = useState("mes");
    const [referencia, setReferencia] = useState(hoy);
    const [fechaInicio, setFechaInicio] = useState(inicioMes);
    const [fechaFin, setFechaFin] = useState(hoy);
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [ranking, setRanking] = useState("mas");

    const parametros = () => {
        const valores = { periodo };

        if (periodo === "rango") {
            valores.fecha_inicio = fechaInicio;
            valores.fecha_fin = fechaFin;
        } else {
            valores.referencia = referencia;
        }

        return valores;
    };

    const generarReporte = async () => {
        setCargando(true);
        setError("");

        try {
            const { data } = await clienteAxios.get("/reportes-compras", {
                params: parametros(),
            });
            setReporte(data.data || data);
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setError(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo generar el reporte de compras."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/reportes-compras", {
                params: { periodo: "mes", referencia: hoy },
            })
            .then(({ data }) => {
                if (activo) setReporte(data.data || data);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo generar el reporte de compras."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const abrirPdf = () => {
        const consulta = new URLSearchParams(parametros()).toString();
        window.open(`/panel/reportes/compras/pdf?${consulta}`, "_blank");
    };

    const maximoDiario = Math.max(
        1,
        ...(reporte?.resumen_diario || []).map((item) => Number(item.total))
    );
    const productosRanking = (
        ranking === "mas"
            ? reporte?.productos_comprados
            : reporte?.productos_menos_comprados
    )?.slice(0, 10) || [];

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Reporte de compras
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Analiza compras, pagos, deudas, proveedores y productos.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirPdf}
                    disabled={!reporte}
                    className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-40"
                >
                    Generar PDF
                </button>
            </div>

            <section className="mt-7 rounded-2xl bg-white p-5 shadow">
                <h3 className="text-xl font-bold text-blue-950">
                    Filtros del reporte
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <label>
                        <span className="mb-1 block font-semibold">Periodo</span>
                        <select
                            value={periodo}
                            onChange={(evento) =>
                                setPeriodo(evento.target.value)
                            }
                            className="w-full rounded-lg border px-4 py-3"
                        >
                            <option value="dia">Por día</option>
                            <option value="semana">Por semana</option>
                            <option value="mes">Por mes</option>
                            <option value="anio">Por año</option>
                            <option value="rango">Rango personalizado</option>
                        </select>
                    </label>

                    {periodo === "rango" ? (
                        <>
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Fecha inicial
                                </span>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(evento) =>
                                        setFechaInicio(evento.target.value)
                                    }
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </label>
                            <label>
                                <span className="mb-1 block font-semibold">
                                    Fecha final
                                </span>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={(evento) =>
                                        setFechaFin(evento.target.value)
                                    }
                                    className="w-full rounded-lg border px-4 py-3"
                                />
                            </label>
                        </>
                    ) : (
                        <label>
                            <span className="mb-1 block font-semibold">
                                {periodo === "dia"
                                    ? "Día"
                                    : "Fecha de referencia"}
                            </span>
                            <input
                                type="date"
                                value={referencia}
                                onChange={(evento) =>
                                    setReferencia(evento.target.value)
                                }
                                className="w-full rounded-lg border px-4 py-3"
                            />
                        </label>
                    )}

                    <button
                        type="button"
                        onClick={generarReporte}
                        disabled={cargando}
                        className="self-end rounded-lg bg-blue-900 px-5 py-3 font-bold text-white disabled:opacity-40"
                    >
                        {cargando ? "Generando..." : "Aplicar filtro"}
                    </button>
                </div>
            </section>

            {error && (
                <div className="mt-5 rounded-lg bg-red-100 p-4 text-red-700">
                    {error}
                </div>
            )}

            {reporte && (
                <>
                    <p className="mt-5 text-sm font-semibold text-slate-600">
                        Periodo: {fecha(reporte.fecha_inicio)} al{" "}
                        {fecha(reporte.fecha_fin)}
                    </p>

                    <section className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {[
                            [
                                "Compras realizadas",
                                reporte.cantidad_compras,
                                "bg-blue-700",
                            ],
                            [
                                "Total comprado",
                                moneda(reporte.total_compras),
                                "bg-violet-700",
                            ],
                            [
                                "Total pagado",
                                moneda(reporte.total_pagado),
                                "bg-green-700",
                            ],
                            [
                                "Deuda pendiente",
                                moneda(reporte.deuda_pendiente),
                                "bg-orange-600",
                            ],
                        ].map(([titulo, valor, color]) => (
                            <article
                                key={titulo}
                                className={`${color} rounded-2xl p-5 text-white shadow`}
                            >
                                <p className="text-sm font-semibold text-white/80">
                                    {titulo}
                                </p>
                                <p className="mt-2 text-3xl font-black">
                                    {valor}
                                </p>
                            </article>
                        ))}
                    </section>

                    <section className="mt-4 grid gap-4 md:grid-cols-2">
                        <article className="rounded-2xl bg-cyan-700 p-5 text-white shadow">
                            <p className="text-sm font-semibold text-white/80">
                                Unidades compradas
                            </p>
                            <p className="mt-2 text-3xl font-black">
                                {reporte.unidades_compradas}
                            </p>
                        </article>
                        <article className="rounded-2xl bg-slate-700 p-5 text-white shadow">
                            <p className="text-sm font-semibold text-white/80">
                                Compra promedio
                            </p>
                            <p className="mt-2 text-3xl font-black">
                                {moneda(reporte.promedio_compra)}
                            </p>
                        </article>
                    </section>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl bg-white p-5 shadow">
                            <h3 className="text-xl font-bold text-blue-950">
                                Compras por día
                            </h3>
                            <div className="mt-5 space-y-4">
                                {(reporte.resumen_diario || []).map((item) => (
                                    <div key={item.fecha}>
                                        <div className="mb-1 flex justify-between text-sm">
                                            <span>{fecha(item.fecha)}</span>
                                            <strong>
                                                {moneda(item.total)} (
                                                {item.cantidad})
                                            </strong>
                                        </div>
                                        <div className="h-3 rounded-full bg-slate-200">
                                            <div
                                                className="h-3 rounded-full bg-violet-700"
                                                style={{
                                                    width: `${Math.max(
                                                        3,
                                                        (Number(item.total) /
                                                            maximoDiario) *
                                                            100
                                                    )}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {!reporte.resumen_diario?.length && (
                                    <p className="text-slate-500">
                                        No hubo compras en este periodo.
                                    </p>
                                )}
                            </div>
                        </section>

                        <section className="rounded-2xl bg-white p-5 shadow">
                            <h3 className="text-xl font-bold text-blue-950">
                                Métodos de pago
                            </h3>
                            <div className="mt-4 overflow-hidden rounded-lg border">
                                <table className="w-full">
                                    <thead className="bg-blue-950 text-white">
                                        <tr>
                                            <th className="p-3 text-left">
                                                Método
                                            </th>
                                            <th className="p-3">Pagos</th>
                                            <th className="p-3">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(reporte.metodos_pago || []).map(
                                            (item) => (
                                                <tr key={item.metodo}>
                                                    <td className="p-3 capitalize">
                                                        {item.metodo}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {item.cantidad}
                                                    </td>
                                                    <td className="p-3 text-center font-bold">
                                                        {moneda(item.total)}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                                {!reporte.metodos_pago?.length && (
                                    <p className="p-6 text-center text-slate-500">
                                        No hay pagos registrados.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl bg-white p-5 shadow">
                            <h3 className="text-xl font-bold text-blue-950">
                                Compras por proveedor
                            </h3>
                            <div className="mt-4 overflow-x-auto rounded-lg border">
                                <table className="w-full">
                                    <thead className="bg-blue-950 text-white">
                                        <tr>
                                            <th className="p-3 text-left">
                                                Proveedor
                                            </th>
                                            <th className="p-3">Compras</th>
                                            <th className="p-3">Total</th>
                                            <th className="p-3">Deuda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(reporte.proveedores || []).map(
                                            (item) => (
                                                <tr
                                                    key={item.proveedor_id}
                                                >
                                                    <td className="p-3 font-semibold">
                                                        {item.proveedor}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        {item.compras}
                                                    </td>
                                                    <td className="p-3 text-center font-bold">
                                                        {moneda(item.total)}
                                                    </td>
                                                    <td className="p-3 text-center font-bold text-orange-700">
                                                        {moneda(item.deuda)}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="rounded-2xl bg-white p-5 shadow">
                            <div className="flex flex-wrap items-end justify-between gap-3">
                                <h3 className="text-xl font-bold text-blue-950">
                                    Ranking de productos
                                </h3>
                                <label className="w-full sm:w-64">
                                    <span className="mb-1 block font-semibold">
                                        Mostrar
                                    </span>
                                    <select
                                        value={ranking}
                                        onChange={(evento) =>
                                            setRanking(evento.target.value)
                                        }
                                        className="w-full rounded-lg border px-4 py-3"
                                    >
                                        <option value="mas">
                                            Productos más comprados
                                        </option>
                                        <option value="menos">
                                            Productos menos comprados
                                        </option>
                                    </select>
                                </label>
                            </div>
                            <div className="mt-4 overflow-x-auto rounded-lg border">
                                <table className="w-full">
                                    <thead className="bg-blue-950 text-white">
                                        <tr>
                                            <th className="p-3 text-left">
                                                Producto
                                            </th>
                                            <th className="p-3">Unidades</th>
                                            <th className="p-3">Importe</th>
                                        </tr>
                                    </thead>
                                    <tbody
                                        key={ranking}
                                        className="divide-y"
                                    >
                                        {productosRanking.map((item) => (
                                            <tr key={item.producto_id}>
                                                <td className="p-3 font-semibold">
                                                    {item.producto}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {item.cantidad}
                                                </td>
                                                <td className="p-3 text-center font-bold">
                                                    {moneda(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {!productosRanking.length && (
                                    <p className="p-6 text-center text-slate-500">
                                        No hay productos comprados.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                        <div className="border-b p-5">
                            <h3 className="text-xl font-bold text-blue-950">
                                Detalle de compras
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-950px">
                                <thead className="bg-blue-950 text-white">
                                    <tr>
                                        <th className="p-3">Compra</th>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Proveedor</th>
                                        <th className="p-3">Documento</th>
                                        <th className="p-3">Unidades</th>
                                        <th className="p-3">Total</th>
                                        <th className="p-3">Pagado</th>
                                        <th className="p-3">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(reporte.compras || []).map((compra) => {
                                        const saldo = Math.max(
                                            0,
                                            Number(compra.total) -
                                                Number(compra.monto_pagado)
                                        );

                                        return (
                                            <tr key={compra.id}>
                                                <td className="p-3 text-center font-bold">
                                                    #{compra.id}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {fecha(compra.fecha)}
                                                </td>
                                                <td className="p-3 font-semibold">
                                                    {
                                                        compra.proveedor
                                                            ?.nombre_empresa
                                                    }
                                                </td>
                                                <td className="p-3 text-center">
                                                    {compra.numero_documento ||
                                                        "-"}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {(
                                                        compra.detalles || []
                                                    ).reduce(
                                                        (suma, item) =>
                                                            suma +
                                                            Number(
                                                                item.cantidad
                                                            ),
                                                        0
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-bold">
                                                    {moneda(compra.total)}
                                                </td>
                                                <td className="p-3 text-center font-bold text-green-700">
                                                    {moneda(
                                                        compra.monto_pagado
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-bold text-orange-700">
                                                    {moneda(saldo)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {!reporte.compras?.length && (
                                <p className="p-8 text-center text-slate-500">
                                    No hay compras en el periodo seleccionado.
                                </p>
                            )}
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default ReportesCompras;
