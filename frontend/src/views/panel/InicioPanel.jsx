import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clienteAxios from "../../config/axios";

const estadoInicial = {
    total_productos: 0,
    cantidad_ventas: 0,
    ganancia_total: 0,
    productos_stock_bajo: 0,
    total_ventas: 0,
    stocks_bajos: [],
};

const InicioPanel = () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const esVendedor = usuario?.role?.nombre === "Vendedor";
    const [resumen, setResumen] = useState(estadoInicial);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargarDashboard = async () => {
        setCargando(true);
        setError("");

        try {
            const { data } = await clienteAxios.get("/dashboard");
            setResumen({
                ...estadoInicial,
                ...(data.data || {}),
            });
        } catch (error) {
            setError(
                error.response?.data?.message ||
                    "No se pudo cargar el resumen del negocio."
            );
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/dashboard")
            .then(({ data }) => {
                if (!activo) return;

                setResumen({
                    ...estadoInicial,
                    ...(data.data || {}),
                });
            })
            .catch((error) => {
                if (!activo) return;

                setError(
                    error.response?.data?.message ||
                        "No se pudo cargar el resumen del negocio."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, []);

    const moneda = (valor) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: "PEN",
        }).format(Number(valor || 0));

    const tarjetas = esVendedor
        ? [
              {
                  titulo: "Registrar venta",
                  valor: "Nueva",
                  detalle: "Buscar productos y cobrar",
                  enlace: "/panel/ventas/registrar",
                  clases: "from-blue-600 to-blue-800",
                  icono: "+",
              },
              {
                  titulo: "Mis ventas",
                  valor: resumen.cantidad_ventas,
                  detalle: `Ingresos: ${moneda(resumen.total_ventas)}`,
                  enlace: "/panel/ventas/listado",
                  clases: "from-violet-600 to-purple-800",
                  icono: "V",
              },
              {
                  titulo: "Comprobantes",
                  valor: resumen.cantidad_ventas,
                  detalle: "Consultar e imprimir comprobantes",
                  enlace: "/panel/ventas/comprobantes",
                  clases: "from-emerald-500 to-green-700",
                  icono: "C",
              },
              {
                  titulo: "Productos disponibles",
                  valor: resumen.total_productos,
                  detalle: "Disponibles para buscar en ventas",
                  enlace: "/panel/ventas/registrar",
                  clases: "from-cyan-600 to-cyan-800",
                  icono: "P",
              },
          ]
        : [
              {
                  titulo: "Total de productos",
                  valor: resumen.total_productos,
                  detalle: "Productos registrados",
                  enlace: "/panel/productos/articulos",
                  clases: "from-blue-600 to-blue-800",
                  icono: "P",
              },
              {
                  titulo: "Total de ventas",
                  valor: resumen.cantidad_ventas,
                  detalle: `Ingresos: ${moneda(resumen.total_ventas)}`,
                  enlace: "/panel/ventas/listado",
                  clases: "from-violet-600 to-purple-800",
                  icono: "V",
              },
              {
                  titulo: "Total de ganancias",
                  valor: moneda(resumen.ganancia_total),
                  detalle: "Ventas menos costo promedio de compra",
                  enlace: "/panel/reportes",
                  clases: "from-emerald-500 to-green-700",
                  icono: "S/",
              },
              {
                  titulo: "Productos con poco stock",
                  valor: resumen.productos_stock_bajo,
                  detalle: "Productos en mínimo o por debajo",
                  enlace: "/panel/stock",
                  clases: "from-orange-500 to-red-600",
                  icono: "!",
              },
          ];

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-blue-950">
                        Bienvenido,{" "}
                        {usuario?.persona?.nombre || usuario?.username}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {esVendedor
                            ? "Accesos rápidos para realizar y consultar tus ventas."
                            : "Resumen general del rendimiento de la tienda."}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={cargarDashboard}
                    disabled={cargando}
                    className="rounded-lg bg-blue-950 px-5 py-3 font-bold text-white hover:bg-blue-900 disabled:opacity-60"
                >
                    {cargando ? "Actualizando..." : "Actualizar datos"}
                </button>
            </div>

            {error && (
                <div className="mt-6 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                    {error}
                </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {tarjetas.map((tarjeta) => (
                    <Link
                        key={tarjeta.titulo}
                        to={tarjeta.enlace}
                        className={`relative min-h-48 overflow-hidden rounded-2xl bg-linear-to-br p-6 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl ${tarjeta.clases}`}
                    >
                        <div className="absolute -right-5 -top-5 flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl font-black">
                            {tarjeta.icono}
                        </div>
                        <div className="relative flex h-full flex-col justify-between">
                            <p className="max-w-44 text-lg font-bold">
                                {tarjeta.titulo}
                            </p>
                            <div>
                                <p className="text-4xl font-black">
                                    {cargando ? "..." : tarjeta.valor}
                                </p>
                                <p className="mt-2 text-sm text-white/80">
                                    {tarjeta.detalle}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {!esVendedor && (
            <section className="mt-8 overflow-hidden rounded-2xl bg-white shadow">
                <div className="flex items-center justify-between border-b px-6 py-5">
                    <div>
                        <h3 className="text-xl font-bold text-blue-950">
                            Productos con poco stock
                        </h3>
                        <p className="text-sm text-gray-500">
                            Variantes que necesitan reposición.
                        </p>
                    </div>

                    <Link
                        to="/panel/stock"
                        className="font-bold text-blue-800 hover:underline"
                    >
                        Ver stock
                    </Link>
                </div>

                {cargando ? (
                    <p className="px-6 py-10 text-center text-gray-500">
                        Cargando inventario...
                    </p>
                ) : resumen.stocks_bajos.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-sm text-slate-600">
                                <tr>
                                    <th className="px-6 py-3">Producto</th>
                                    <th className="px-6 py-3">Talla</th>
                                    <th className="px-6 py-3">Color</th>
                                    <th className="px-6 py-3">Stock actual</th>
                                    <th className="px-6 py-3">Stock mínimo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {resumen.stocks_bajos
                                    .slice(0, 8)
                                    .map((stock) => (
                                        <tr
                                            key={stock.id}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="px-6 py-4 font-semibold text-slate-800">
                                                {stock.producto?.nombre ||
                                                    "Producto"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {stock.talla?.nombre || "-"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {stock.color?.nombre || "-"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="rounded-full bg-red-100 px-3 py-1 font-bold text-red-700">
                                                    {stock.cantidad}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {stock.stock_minimo}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="px-6 py-12 text-center">
                        <p className="font-semibold text-green-700">
                            Todo el inventario tiene stock suficiente.
                        </p>
                    </div>
                )}
            </section>
            )}
        </>
    );
};

export default InicioPanel;
