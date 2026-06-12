import { useEffect, useMemo, useState } from "react";
import clienteAxios from "../../config/axios";

const normalizar = (valor) =>
    String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const moneda = (valor) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(Number(valor || 0));

const estadoStock = (stock) => {
    const cantidad = Number(stock.cantidad || 0);
    const minimo = Number(stock.stock_minimo || 0);

    if (cantidad <= 0) {
        return {
            valor: "agotado",
            texto: "Agotado",
            clase: "bg-red-100 text-red-700",
        };
    }

    if (cantidad <= minimo) {
        return {
            valor: "bajo",
            texto: "Stock bajo",
            clase: "bg-orange-100 text-orange-700",
        };
    }

    return {
        valor: "disponible",
        texto: "Disponible",
        clase: "bg-green-100 text-green-700",
    };
};

const ReporteInventarioPanel = () => {
    const [stocks, setStocks] = useState([]);
    const [busqueda, setBusqueda] = useState("");
    const [categoria, setCategoria] = useState("todas");
    const [estado, setEstado] = useState("todos");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/reportes-inventario")
            .then(({ data }) => {
                if (activo) setStocks(data.data?.inventario || []);
            })
            .catch((peticionError) => {
                if (!activo) return;
                setError(
                    peticionError.response?.data?.message ||
                        "No se pudo cargar el inventario."
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
        const opciones = new Map();

        stocks.forEach((stock) => {
            const categoriaStock = stock.producto?.categoria;

            if (categoriaStock) {
                opciones.set(categoriaStock.id, categoriaStock.nombre);
            }
        });

        return [...opciones.entries()].sort((a, b) =>
            a[1].localeCompare(b[1], "es", { sensitivity: "base" })
        );
    }, [stocks]);

    const stocksFiltrados = useMemo(() => {
        const texto = normalizar(busqueda.trim());

        return stocks.filter((stock) => {
            const estadoActual = estadoStock(stock).valor;
            const coincideCategoria =
                categoria === "todas" ||
                String(stock.producto?.categoria?.id) === categoria;
            const coincideEstado =
                estado === "todos" || estadoActual === estado;
            const contenido = normalizar(
                `${stock.codigo} ${stock.producto?.nombre} ${
                    stock.producto?.categoria?.nombre
                } ${stock.producto?.marca?.nombre} ${
                    stock.talla?.nombre
                } ${stock.color?.nombre}`
            );

            return (
                coincideCategoria &&
                coincideEstado &&
                (!texto || contenido.includes(texto))
            );
        });
    }, [busqueda, categoria, estado, stocks]);

    const resumen = useMemo(() => {
        const productos = new Set();
        let unidades = 0;
        let stockBajo = 0;

        stocks.forEach((stock) => {
            if (stock.producto?.id) productos.add(stock.producto.id);
            unidades += Number(stock.cantidad || 0);
            if (estadoStock(stock).valor !== "disponible") stockBajo += 1;
        });

        return {
            productos: productos.size,
            unidades,
            stockBajo,
        };
    }, [stocks]);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-blue-950">
                        Reporte de inventario
                    </h2>
                    <p className="mt-1 text-slate-600">
                        Consulta las existencias actuales de la tienda.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        window.open(
                            "/panel/productos/reporte-inventario",
                            "_blank",
                            "noopener,noreferrer"
                        )
                    }
                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white"
                >
                    Imprimir / Guardar PDF
                </button>
            </div>

            {error && (
                <div className="mt-5 rounded-lg bg-red-100 p-4 text-red-700">
                    {error}
                </div>
            )}

            <section className="mt-6 grid gap-3 sm:grid-cols-3">
                <article className="rounded-lg border-l-4 border-blue-700 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Productos</p>
                    <strong className="text-2xl text-blue-950">
                        {resumen.productos}
                    </strong>
                </article>
                <article className="rounded-lg border-l-4 border-green-700 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Unidades en stock</p>
                    <strong className="text-2xl text-blue-950">
                        {resumen.unidades}
                    </strong>
                </article>
                <article className="rounded-lg border-l-4 border-orange-500 bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Variantes con alerta
                    </p>
                    <strong className="text-2xl text-blue-950">
                        {resumen.stockBajo}
                    </strong>
                </article>
            </section>

            <section className="mt-5 rounded-xl bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-3">
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(evento) => setBusqueda(evento.target.value)}
                        placeholder="Buscar producto, código o marca..."
                        className="rounded-lg border px-4 py-3"
                    />
                    <select
                        value={categoria}
                        onChange={(evento) => setCategoria(evento.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todas">Todas las categorías</option>
                        {categorias.map(([id, nombre]) => (
                            <option key={id} value={id}>
                                {nombre}
                            </option>
                        ))}
                    </select>
                    <select
                        value={estado}
                        onChange={(evento) => setEstado(evento.target.value)}
                        className="rounded-lg border px-4 py-3"
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="disponible">Disponible</option>
                        <option value="bajo">Stock bajo</option>
                        <option value="agotado">Agotado</option>
                    </select>
                </div>
            </section>

            <section className="mt-5 overflow-hidden rounded-xl bg-white shadow-sm">
                <div className="border-b px-4 py-3 text-sm text-slate-600">
                    {stocksFiltrados.length} variantes encontradas
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[950px]">
                        <thead className="bg-blue-950 text-white">
                            <tr>
                                <th className="p-3 text-left">Código</th>
                                <th className="p-3 text-left">Producto</th>
                                <th className="p-3 text-left">Categoría</th>
                                <th className="p-3">Talla / Color</th>
                                <th className="p-3">Precio</th>
                                <th className="p-3">Stock</th>
                                <th className="p-3">Mínimo</th>
                                <th className="p-3">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {stocksFiltrados.map((stock) => {
                                const estadoActual = estadoStock(stock);

                                return (
                                    <tr key={stock.id}>
                                        <td className="p-3 font-mono text-sm">
                                            {stock.codigo || "-"}
                                        </td>
                                        <td className="p-3 font-semibold">
                                            {stock.producto?.nombre || "-"}
                                            <span className="block text-xs font-normal text-slate-500">
                                                {stock.producto?.marca
                                                    ?.nombre || "Sin marca"}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            {stock.producto?.categoria
                                                ?.nombre || "Sin categoría"}
                                        </td>
                                        <td className="p-3 text-center">
                                            {[
                                                stock.talla?.nombre,
                                                stock.color?.nombre,
                                            ]
                                                .filter(Boolean)
                                                .join(" / ") || "General"}
                                        </td>
                                        <td className="p-3 text-center">
                                            {moneda(stock.precio)}
                                        </td>
                                        <td className="p-3 text-center text-lg font-bold">
                                            {stock.cantidad}
                                        </td>
                                        <td className="p-3 text-center">
                                            {stock.stock_minimo}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span
                                                className={`rounded-full px-3 py-1 text-sm font-bold ${estadoActual.clase}`}
                                            >
                                                {estadoActual.texto}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {!cargando && !stocksFiltrados.length && (
                    <p className="p-8 text-center text-slate-500">
                        No hay productos que coincidan con los filtros.
                    </p>
                )}
                {cargando && (
                    <p className="p-8 text-center text-slate-500">
                        Cargando inventario...
                    </p>
                )}
            </section>
        </div>
    );
};

export default ReporteInventarioPanel;
