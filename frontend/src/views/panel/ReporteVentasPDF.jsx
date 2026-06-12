import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import clienteAxios from "../../config/axios";

const moneda = (valor) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor || 0));

const fecha = (valor) =>
    valor
        ? new Intl.DateTimeFormat("es-PE", {
              dateStyle: "long",
          }).format(new Date(`${String(valor).slice(0, 10)}T12:00:00`))
        : "-";

const ReporteVentasPDF = () => {
    const [searchParams] = useSearchParams();
    const [reporte, setReporte] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/reportes-ventas", {
                params: Object.fromEntries(searchParams.entries()),
            })
            .then(({ data }) => {
                if (activo) setReporte(data.data || data);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo generar el reporte."
                );
            });

        return () => {
            activo = false;
        };
    }, [searchParams]);

    if (error) {
        return <p className="p-10 text-center text-red-700">{error}</p>;
    }

    if (!reporte) {
        return <p className="p-10 text-center">Generando reporte...</p>;
    }

    return (
        <div className="min-h-screen bg-slate-200 px-4 py-8 print:bg-white print:p-0">
            <div className="mx-auto mb-5 flex max-w-6xl justify-between print:hidden">
                <Link
                    to="/panel/reportes/ventas"
                    className="rounded-lg bg-slate-600 px-5 py-3 font-bold text-white"
                >
                    Volver
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-red-700 px-5 py-3 font-bold text-white"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            <main className="mx-auto max-w-6xl bg-white p-8 shadow-xl print:max-w-none print:p-2 print:shadow-none">
                <header className="border-b-2 border-slate-900 pb-5 text-center">
                    <h1 className="text-2xl font-black uppercase">
                        Reporte de ventas
                    </h1>
                    <p className="mt-1 font-semibold">Novedades Fernando</p>
                    <p className="mt-2 text-sm">
                        Del {fecha(reporte.fecha_inicio)} al{" "}
                        {fecha(reporte.fecha_fin)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Generado el{" "}
                        {new Intl.DateTimeFormat("es-PE", {
                            dateStyle: "long",
                            timeStyle: "short",
                        }).format(new Date())}
                    </p>
                </header>

                <section className="mt-6 grid grid-cols-4 gap-3 text-center">
                    <article className="border p-3">
                        <p className="text-xs">Ventas</p>
                        <strong className="text-xl">
                            {reporte.cantidad_ventas}
                        </strong>
                    </article>
                    <article className="border p-3">
                        <p className="text-xs">Ingresos</p>
                        <strong className="text-xl">
                            {moneda(reporte.total_ventas)}
                        </strong>
                    </article>
                    <article className="border p-3">
                        <p className="text-xs">Promedio</p>
                        <strong className="text-xl">
                            {moneda(reporte.promedio_venta)}
                        </strong>
                    </article>
                    <article className="border p-3">
                        <p className="text-xs">Unidades</p>
                        <strong className="text-xl">
                            {reporte.unidades_vendidas}
                        </strong>
                    </article>
                </section>

                <h2 className="mt-7 text-lg font-bold">Detalle de ventas</h2>
                <table className="mt-3 w-full border-collapse text-xs">
                    <thead>
                        <tr>
                            <th className="border border-slate-700 p-2">N.º</th>
                            <th className="border border-slate-700 p-2">
                                Fecha
                            </th>
                            <th className="border border-slate-700 p-2">
                                Comprobante
                            </th>
                            <th className="border border-slate-700 p-2">
                                Productos
                            </th>
                            <th className="border border-slate-700 p-2">
                                Vendedor
                            </th>
                            <th className="border border-slate-700 p-2">
                                Pago
                            </th>
                            <th className="border border-slate-700 p-2">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(reporte.ventas || []).map((venta) => (
                            <tr key={venta.id}>
                                <td className="border border-slate-700 p-2 text-center">
                                    {venta.id}
                                </td>
                                <td className="border border-slate-700 p-2 text-center">
                                    {fecha(venta.fecha)}
                                </td>
                                <td className="border border-slate-700 p-2 text-center">
                                    {venta.comprobante?.numero || "-"}
                                </td>
                                <td className="border border-slate-700 p-2">
                                    {(venta.detalles || [])
                                        .map(
                                            (item) =>
                                                `${item.stock?.producto?.nombre || "Producto"} (${item.cantidad})`
                                        )
                                        .join(", ")}
                                </td>
                                <td className="border border-slate-700 p-2 text-center">
                                    {venta.vendedor_reporte || "Sistema"}
                                </td>
                                <td className="border border-slate-700 p-2 text-center capitalize">
                                    {venta.metodo_pago_reporte ||
                                        venta.metodo_pago}
                                </td>
                                <td className="border border-slate-700 p-2 text-right font-bold">
                                    {moneda(venta.total)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td
                                colSpan="6"
                                className="border border-slate-700 p-2 text-right font-bold"
                            >
                                TOTAL
                            </td>
                            <td className="border border-slate-700 p-2 text-right text-base font-black">
                                {moneda(reporte.total_ventas)}
                            </td>
                        </tr>
                    </tfoot>
                </table>

                <div className="mt-7 grid grid-cols-3 gap-6 break-inside-avoid">
                    <section>
                        <h2 className="font-bold">Métodos de pago</h2>
                        {(reporte.metodos_pago || []).map((item) => (
                            <div
                                key={item.metodo}
                                className="mt-2 flex justify-between border-b pb-1 text-sm"
                            >
                                <span className="capitalize">
                                    {item.metodo} ({item.cantidad})
                                </span>
                                <strong>{moneda(item.total)}</strong>
                            </div>
                        ))}
                    </section>
                    <section>
                        <h2 className="font-bold">
                            Productos más vendidos
                        </h2>
                        {(reporte.productos_vendidos || [])
                            .map((item) => (
                                <div
                                    key={item.producto}
                                    className="mt-2 flex justify-between border-b pb-1 text-sm"
                                >
                                    <span>{item.producto}</span>
                                    <strong>{item.cantidad} und.</strong>
                                </div>
                            ))}
                    </section>
                    <section>
                        <h2 className="font-bold">
                            Productos menos vendidos
                        </h2>
                        {(reporte.productos_menos_vendidos || []).map(
                            (item) => (
                                <div
                                    key={item.producto}
                                    className="mt-2 flex justify-between border-b pb-1 text-sm"
                                >
                                    <span>{item.producto}</span>
                                    <strong>{item.cantidad} und.</strong>
                                </div>
                            )
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
};

export default ReporteVentasPDF;
