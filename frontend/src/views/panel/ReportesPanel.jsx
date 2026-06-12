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

const ReportesPanel = () => {
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
            const { data } = await clienteAxios.get("/reportes-ventas", {
                params: parametros(),
            });
            setReporte(data.data || data);
        } catch (peticionError) {
            const errores = peticionError.response?.data?.errors;
            setError(
                (errores && Object.values(errores).flat()[0]) ||
                    peticionError.response?.data?.message ||
                    "No se pudo generar el reporte de ventas."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/reportes-ventas", {
                params: {
                    periodo: "mes",
                    referencia: hoy,
                },
            })
            .then(({ data }) => {
                if (activo) setReporte(data.data || data);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo generar el reporte de ventas."
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
        window.open(`/panel/reportes/ventas/pdf?${consulta}`, "_blank");
    };

    const maximoDiario = Math.max(
        1,
        ...(reporte?.resumen_diario || []).map((item) => Number(item.total))
    );
    const productosRanking = (
        ranking === "mas"
            ? reporte?.productos_vendidos
            : reporte?.productos_menos_vendidos
    )?.slice(0, 10) || [];

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Reporte de ventas
                    </h2>
                    <p className="mt-2 text-slate-600">
                        Consulta ventas por día, semana, mes, año o rango.
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
                        <span className="mb-1 block font-semibold">
                            Periodo
                        </span>
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
                                "Ventas realizadas",
                                reporte.cantidad_ventas,
                                "bg-blue-700",
                            ],
                            [
                                "Ingresos por ventas",
                                moneda(reporte.total_ventas),
                                "bg-green-700",
                            ],
                            [
                                "Venta promedio",
                                moneda(reporte.promedio_venta),
                                "bg-violet-700",
                            ],
                            [
                                "Unidades vendidas",
                                reporte.unidades_vendidas,
                                "bg-cyan-700",
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

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <section className="rounded-2xl bg-white p-5 shadow">
                            <h3 className="text-xl font-bold text-blue-950">
                                Ventas por día
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
                                                className="h-3 rounded-full bg-blue-700"
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
                                        No hubo ventas en este periodo.
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
                                            <th className="p-3">Ventas</th>
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
                            </div>
                        </section>
                    </div>

                    <section className="mt-6 rounded-2xl bg-white p-5 shadow">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h3 className="text-xl font-bold text-blue-950">
                                Ranking de productos
                            </h3>
                            <label className="w-full sm:w-72">
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
                                        Productos más vendidos
                                    </option>
                                    <option value="menos">
                                        Productos menos vendidos
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
                                <tbody key={ranking} className="divide-y">
                                    {productosRanking.map((item, indice) => (
                                        <tr
                                            key={
                                                item.id ||
                                                item.producto_id ||
                                                item.codigo ||
                                                `${ranking}-${item.producto}-${indice}`
                                            }
                                        >
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
                                    No hay productos vendidos.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
                        <div className="border-b p-5">
                            <h3 className="text-xl font-bold text-blue-950">
                                Detalle de ventas
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px">
                                <thead className="bg-blue-950 text-white">
                                    <tr>
                                        <th className="p-3">Venta</th>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Comprobante</th>
                                        <th className="p-3">Vendedor</th>
                                        <th className="p-3">Pago</th>
                                        <th className="p-3">Unidades</th>
                                        <th className="p-3">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {(reporte.ventas || []).map((venta) => (
                                        <tr key={venta.id}>
                                            <td className="p-3 text-center font-bold">
                                                #{venta.id}
                                            </td>
                                            <td className="p-3 text-center">
                                                {fecha(venta.fecha)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {venta.comprobante?.numero ||
                                                    "-"}
                                            </td>
                                            <td className="p-3 text-center">
                                                {venta.vendedor_reporte ||
                                                    "Sistema"}
                                            </td>
                                            <td className="p-3 text-center capitalize">
                                                {venta.metodo_pago_reporte ||
                                                    venta.metodo_pago}
                                            </td>
                                            <td className="p-3 text-center">
                                                {(venta.detalles || []).reduce(
                                                    (suma, item) =>
                                                        suma +
                                                        Number(item.cantidad),
                                                    0
                                                )}
                                            </td>
                                            <td className="p-3 text-center font-bold text-green-700">
                                                {moneda(venta.total)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
};

export default ReportesPanel;
