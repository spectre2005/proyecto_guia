import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import clienteAxios from "../../config/axios";

const ordenTallasRopa = [
    "XXS",
    "XS",
    "S",
    "M",
    "L",
    "XL",
    "XXL",
    "XXXL",
];

const compararTallas = (tallaA, tallaB) => {
    const valorA = String(tallaA || "").trim().toUpperCase();
    const valorB = String(tallaB || "").trim().toUpperCase();
    const numeroA = Number(valorA);
    const numeroB = Number(valorB);
    const esNumeroA = valorA !== "" && Number.isFinite(numeroA);
    const esNumeroB = valorB !== "" && Number.isFinite(numeroB);

    if (esNumeroA && esNumeroB) return numeroA - numeroB;
    if (esNumeroA) return 1;
    if (esNumeroB) return -1;

    const posicionA = ordenTallasRopa.indexOf(valorA);
    const posicionB = ordenTallasRopa.indexOf(valorB);

    if (posicionA !== -1 || posicionB !== -1) {
        if (posicionA === -1) return 1;
        if (posicionB === -1) return -1;
        return posicionA - posicionB;
    }

    return valorA.localeCompare(valorB, "es", {
        numeric: true,
        sensitivity: "base",
    });
};

const ReporteInventarioProductos = () => {
    const [stocks, setStocks] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/reportes-inventario")
            .then(({ data }) => {
                if (!activo) return;
                setStocks(data.data?.inventario || []);
            })
            .catch((errorPeticion) => {
                if (!activo) return;
                setError(
                    errorPeticion.response?.data?.message ||
                        "No se pudo generar el reporte."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const categorias = useMemo(() => {
        const grupos = new Map();

        stocks
            .filter(
                (stock) =>
                    Number(stock.cantidad || 0) > 0 &&
                    stock.producto &&
                    stock.producto.estado !== false &&
                    Number(stock.producto.estado) !== 0
            )
            .forEach((stock) => {
                const categoriaId =
                    stock.producto.categoria?.id || "sin-categoria";
                const categoriaNombre =
                    stock.producto.categoria?.nombre || "Sin categoría";

                if (!grupos.has(categoriaId)) {
                    grupos.set(categoriaId, {
                        id: categoriaId,
                        nombre: categoriaNombre,
                        productos: new Map(),
                        tallas: new Set(),
                    });
                }

                const grupo = grupos.get(categoriaId);
                const productoId = stock.producto.id;
                const talla = stock.talla?.nombre || "Única";

                grupo.tallas.add(talla);

                if (!grupo.productos.has(productoId)) {
                    grupo.productos.set(productoId, {
                        id: productoId,
                        nombre: stock.producto.nombre,
                        codigos: new Set(),
                        stockTotal: 0,
                        cantidadesPorTalla: new Map(),
                    });
                }

                const producto = grupo.productos.get(productoId);

                if (stock.codigo) producto.codigos.add(stock.codigo);
                producto.stockTotal += Number(stock.cantidad || 0);
                producto.cantidadesPorTalla.set(
                    talla,
                    (producto.cantidadesPorTalla.get(talla) || 0) +
                        Number(stock.cantidad || 0)
                );
            });

        return [...grupos.values()]
            .map((grupo) => ({
                ...grupo,
                tallas: [...grupo.tallas].sort(compararTallas),
                productos: [...grupo.productos.values()].sort((a, b) =>
                    a.nombre.localeCompare(b.nombre, "es", {
                        sensitivity: "base",
                    })
                ),
            }))
            .sort((a, b) =>
                a.nombre.localeCompare(b.nombre, "es", {
                    sensitivity: "base",
                })
            );
    }, [stocks]);

    const totalUnidades = categorias.reduce(
        (total, categoria) =>
            total +
            categoria.productos.reduce(
                (subtotal, producto) => subtotal + producto.stockTotal,
                0
            ),
        0
    );

    if (cargando) {
        return <p className="p-8">Generando reporte de inventario...</p>;
    }

    return (
        <div className="min-h-screen bg-slate-200 px-4 py-8 print:bg-white print:p-0">
            <div className="mx-auto mb-5 flex max-w-6xl items-center justify-between gap-4 print:hidden">
                <Link
                    to="/panel/productos/articulos"
                    className="rounded-lg bg-slate-600 px-5 py-3 font-bold text-white hover:bg-slate-700"
                >
                    Volver a productos
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-950"
                >
                    Guardar como PDF
                </button>
            </div>

            <main className="mx-auto min-h-[297mm] max-w-6xl bg-white p-8 shadow-xl print:min-h-0 print:max-w-none print:p-0 print:shadow-none">
                <header className="mb-7 border-b-2 border-slate-900 pb-4 text-center">
                    <h1 className="text-2xl font-black uppercase">
                        Inventario de artículos disponibles
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Novedades Fernando
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        Generado el{" "}
                        {new Intl.DateTimeFormat("es-PE", {
                            dateStyle: "long",
                            timeStyle: "short",
                        }).format(new Date())}
                    </p>
                </header>

                {error && (
                    <div className="rounded-lg bg-red-100 p-4 text-red-700">
                        {error}
                    </div>
                )}

                {!error && categorias.length === 0 && (
                    <p className="rounded-lg border p-6 text-center text-slate-500">
                        No hay productos disponibles con stock.
                    </p>
                )}

                {categorias.map((categoria) => (
                    <section
                        key={categoria.id}
                        className="mb-8 break-inside-avoid"
                    >
                        <h2 className="mb-3 bg-blue-950 px-4 py-2 text-lg font-bold uppercase text-white print:bg-slate-200 print:text-black">
                            {categoria.nombre}
                        </h2>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr>
                                        <th className="border border-slate-800 p-2 text-left">
                                            Código
                                        </th>
                                        <th className="border border-slate-800 p-2 text-left">
                                            Producto
                                        </th>
                                        <th className="border border-slate-800 p-2 text-center">
                                            Stock
                                        </th>
                                        {categoria.tallas.map((talla) => (
                                            <th
                                                key={talla}
                                                className="border border-slate-800 p-2 text-center"
                                            >
                                                {talla}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoria.productos.map((producto) => (
                                        <tr key={producto.id}>
                                            <td className="border border-slate-800 p-2">
                                                {[...producto.codigos].join(
                                                    ", "
                                                ) || "-"}
                                            </td>
                                            <td className="border border-slate-800 p-2 font-semibold">
                                                {producto.nombre}
                                            </td>
                                            <td className="border border-slate-800 p-2 text-center font-bold">
                                                {producto.stockTotal}
                                            </td>
                                            {categoria.tallas.map((talla) => (
                                                <td
                                                    key={talla}
                                                    className="border border-slate-800 p-2 text-center"
                                                >
                                                    {producto.cantidadesPorTalla.get(
                                                        talla
                                                    ) || 0}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                ))}

                {categorias.length > 0 && (
                    <footer className="mt-8 flex justify-end border-t pt-4 font-bold">
                        Stock total disponible: {totalUnidades} unidades
                    </footer>
                )}
            </main>
        </div>
    );
};

export default ReporteInventarioProductos;
