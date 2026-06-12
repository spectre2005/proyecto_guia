import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
              timeStyle: "short",
          }).format(new Date(valor))
        : "-";

const ComprobanteVenta = () => {
    const { ventaId } = useParams();
    const [venta, setVenta] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get(`/ventas/${ventaId}`)
            .then(({ data }) => {
                if (activo) setVenta(data.data || data);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo cargar el comprobante."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [ventaId]);

    if (cargando) {
        return <p className="p-12 text-center">Cargando comprobante...</p>;
    }

    if (error || !venta) {
        return (
            <p className="p-12 text-center font-bold text-red-600">
                {error || "Comprobante no encontrado."}
            </p>
        );
    }

    const vendedor = venta.usuario?.persona;
    const comprobante = venta.comprobante;

    return (
        <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
            <div className="mx-auto mb-5 flex max-w-4xl justify-end gap-3 print:hidden">
                <button
                    type="button"
                    onClick={() => window.close()}
                    className="rounded-lg bg-slate-600 px-5 py-3 font-bold text-white"
                >
                    Cerrar
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-blue-800 px-5 py-3 font-bold text-white"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            <main className="mx-auto max-w-4xl bg-white p-10 shadow-xl print:max-w-none print:p-4 print:shadow-none">
                <header className="grid gap-6 border-b-2 border-blue-950 pb-6 md:grid-cols-2">
                    <div>
                        <h1 className="text-3xl font-black text-blue-950">
                            Novedades Fernando
                        </h1>
                        <p className="mt-2">Quillabamba, Cusco</p>
                        <p>Venta de ropa, calzado y accesorios</p>
                    </div>
                    <div className="rounded-xl border-2 border-blue-950 p-5 text-center">
                        <p className="text-lg font-bold uppercase">
                            {comprobante?.tipo || "Comprobante"}
                        </p>
                        <p className="mt-2 text-2xl font-black text-blue-950">
                            {comprobante?.numero || `VENTA-${venta.id}`}
                        </p>
                    </div>
                </header>

                <section className="mt-6 grid gap-3 text-sm md:grid-cols-2">
                    <p>
                        <strong>Fecha:</strong> {fecha(venta.fecha)}
                    </p>
                    <p>
                        <strong>Vendedor:</strong>{" "}
                        {vendedor
                            ? `${vendedor.nombre} ${vendedor.apellido}`
                            : `Usuario #${venta.usuarios_id}`}
                    </p>
                    <p>
                        <strong>Método de pago:</strong>{" "}
                        <span className="capitalize">{venta.metodo_pago}</span>
                    </p>
                    <p>
                        <strong>Estado:</strong>{" "}
                        <span className="uppercase">{venta.estado}</span>
                    </p>
                </section>

                <div className="mt-7 overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-3 text-left">Producto</th>
                                <th className="p-3">Código</th>
                                <th className="p-3">Talla / color</th>
                                <th className="p-3">Cantidad</th>
                                <th className="p-3">Precio</th>
                                <th className="p-3">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {(venta.detalles || []).map((detalle) => (
                                <tr key={detalle.id}>
                                    <td className="p-3 font-semibold">
                                        {detalle.stock?.producto?.nombre ||
                                            "Producto"}
                                    </td>
                                    <td className="p-3 text-center">
                                        {detalle.stock?.codigo || "-"}
                                    </td>
                                    <td className="p-3 text-center">
                                        {detalle.stock?.talla?.nombre || "-"} /{" "}
                                        {detalle.stock?.color?.nombre || "-"}
                                    </td>
                                    <td className="p-3 text-center">
                                        {detalle.cantidad}
                                    </td>
                                    <td className="p-3 text-center">
                                        {moneda(detalle.precio_unitario)}
                                    </td>
                                    <td className="p-3 text-center font-bold">
                                        {moneda(detalle.subtotal)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <section className="ml-auto mt-7 max-w-sm space-y-2">
                    <div className="flex justify-between border-t-2 border-blue-950 pt-3 text-xl">
                        <span className="font-black">TOTAL</span>
                        <strong>{moneda(venta.total)}</strong>
                    </div>
                    {venta.metodo_pago === "efectivo" && (
                        <>
                            <div className="flex justify-between">
                                <span>Efectivo recibido</span>
                                <strong>{moneda(venta.monto_recibido)}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span>Vuelto</span>
                                <strong>{moneda(venta.vuelto)}</strong>
                            </div>
                        </>
                    )}
                </section>

                <footer className="mt-12 border-t pt-5 text-center text-sm text-slate-500">
                    <p className="font-bold text-blue-950">
                        Gracias por comprar en Novedades Fernando
                    </p>
                    <p className="mt-1">
                        Este documento fue generado por el sistema de ventas.
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default ComprobanteVenta;
