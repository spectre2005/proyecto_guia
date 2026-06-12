import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";

const contarProductosDistintos = (detalles = []) =>
    new Set(
        detalles
            .map((detalle) => detalle.stock?.producto?.id)
            .filter(Boolean)
    ).size;

const PedidosUsuario = () => {
    const navigate = useNavigate();
    const { productos } = useProductos();
    const [usuario, setUsuario] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );
    const [pedidos, setPedidos] = useState([]);
    const [cantidadCarrito, setCantidadCarrito] = useState(0);
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/mi-cuenta")
            .then(({ data }) => {
                if (!activo) return;

                setPedidos(data.pedidos || []);
                setUsuario(data.usuario);
                localStorage.setItem(
                    "usuario",
                    JSON.stringify(data.usuario)
                );
            })
            .catch((error) => {
                if (!activo) return;

                if (error.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    navigate("/");
                    return;
                }

                setMensaje(
                    error.response?.data?.message ||
                        "No se pudieron cargar tus pedidos."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [navigate]);

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/mi-carrito")
            .then(({ data }) => {
                if (!activo) return;

                setCantidadCarrito(
                    contarProductosDistintos(data.data?.detalles)
                );
            })
            .catch(() => {
                if (activo) setCantidadCarrito(0);
            });

        return () => {
            activo = false;
        };
    }, []);

    const resultadosBusqueda = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto || !Array.isArray(productos)) return [];

        return productos
            .filter((producto) =>
                producto.nombre?.toLowerCase().includes(texto)
            )
            .slice(0, 5);
    }, [busqueda, productos]);

    const buscarProductos = (e) => {
        e.preventDefault();

        if (busqueda.trim()) {
            navigate(`/?buscar=${encodeURIComponent(busqueda.trim())}`);
        }
    };

    const cerrarSesion = async () => {
        try {
            await clienteAxios.post("/logout");
        } catch {
            // La sesión local también se limpia si el token ya venció.
        }

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/");
    };

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-blue-950 text-white">
                <div className="flex items-center gap-4 px-6 py-4">
                    <Link to="/" className="flex shrink-0 items-center gap-4">
                        <img
                            src={logoTienda}
                            alt="Novedades Fernando"
                            className="h-16 w-16 rounded-full bg-white p-1 object-contain"
                        />
                        <div className="hidden min-w-220px lg:block">
                            <h1 className="text-2xl font-bold">
                                Novedades Fernando
                            </h1>
                            <p className="text-sm text-blue-200">
                                El Palacio del Jeans
                            </p>
                        </div>
                    </Link>

                    <form
                        onSubmit={buscarProductos}
                        className="relative flex flex-1 rounded-xl border-2 border-yellow-400 bg-white p-1 shadow-lg"
                    >
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar jeans, polos, casacas..."
                            className="w-full rounded-l-lg px-5 py-3 text-base text-gray-800 outline-none"
                        />
                        <button className="rounded-lg bg-yellow-400 px-6 font-bold text-blue-950 hover:bg-yellow-500">
                            Buscar
                        </button>

                        {busqueda.trim() && (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border bg-white text-slate-800 shadow-2xl">
                                {resultadosBusqueda.length ? (
                                    resultadosBusqueda.map((producto) => (
                                        <button
                                            key={producto.id}
                                            type="button"
                                            onMouseDown={() =>
                                                navigate(
                                                    `/?buscar=${encodeURIComponent(producto.nombre)}`
                                                )
                                            }
                                            className="block w-full border-b px-4 py-3 text-left font-semibold last:border-0 hover:bg-blue-50"
                                        >
                                            {producto.nombre}
                                        </button>
                                    ))
                                ) : (
                                    <p className="px-4 py-3 text-sm text-slate-500">
                                        No se encontraron productos.
                                    </p>
                                )}
                            </div>
                        )}
                    </form>

                    <div className="group relative shrink-0 py-2">
                        <button
                            type="button"
                            className="rounded-lg px-3 py-1 text-right outline-none hover:bg-blue-900 focus:bg-blue-900"
                        >
                            <span className="block text-sm text-blue-200">
                                Bienvenido
                            </span>
                            <span className="block font-bold">
                                {usuario?.username} ▾
                            </span>
                        </button>

                        <div className="absolute right-0 top-full z-40 hidden w-64 pt-2 group-hover:block group-focus-within:block">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-left text-slate-700 shadow-2xl">
                                <div className="border-b px-4 py-3">
                                    <p className="font-bold text-blue-950">
                                        {usuario?.persona?.nombre ||
                                            usuario?.username}{" "}
                                        {usuario?.persona?.apellido || ""}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {usuario?.persona?.email ||
                                            "Cuenta de usuario"}
                                    </p>
                                </div>
                                <Link
                                    to="/perfil"
                                    className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-900"
                                >
                                    Mi cuenta
                                </Link>
                                <Link
                                    to="/pedidos"
                                    className="block bg-blue-50 px-4 py-3 font-bold text-blue-900"
                                >
                                    Mis pedidos
                                </Link>
                                <button
                                    type="button"
                                    onClick={cerrarSesion}
                                    className="block w-full border-t px-4 py-3 text-left font-semibold text-red-600 hover:bg-red-50"
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        </div>
                    </div>

                    <Link
                        to="/carrito"
                        className="relative shrink-0 rounded-lg bg-yellow-400 px-5 py-3 font-bold text-blue-950 hover:bg-yellow-500"
                    >
                        Carrito
                        {cantidadCarrito > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                                {cantidadCarrito}
                            </span>
                        )}
                    </Link>
                </div>

                <NavegacionTienda />
            </header>

            <main className="mx-auto max-w-5xl px-6 py-10">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-blue-950">
                        Mis pedidos
                    </h1>
                    <p className="text-slate-600">
                        Revisa el estado y detalle de tus compras.
                    </p>
                </div>

                {mensaje && (
                    <div className="mb-5 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                        {mensaje}
                    </div>
                )}

                {cargando ? (
                    <div className="rounded-2xl bg-white py-16 text-center text-slate-500 shadow">
                        Cargando pedidos...
                    </div>
                ) : pedidos.length ? (
                    <div className="space-y-5">
                        {pedidos.map((pedido) => (
                            <Link
                                key={pedido.id}
                                to={`/pagos/detalles/${pedido.id}`}
                                className="block rounded-2xl bg-white p-6 shadow transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-700"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-blue-950">
                                            Pedido #
                                            {String(pedido.id).padStart(6, "0")}
                                        </h2>
                                        <p className="text-sm text-slate-500">
                                            {pedido.fecha
                                                ? new Date(
                                                      pedido.fecha
                                                  ).toLocaleString("es-PE")
                                                : "Fecha no disponible"}
                                        </p>
                                    </div>

                                    <div className="text-right">
                                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold capitalize text-green-700">
                                            {pedido.estado}
                                        </span>
                                        <p className="mt-2 text-2xl font-bold text-blue-950">
                                            S/{" "}
                                            {Number(pedido.total || 0).toFixed(
                                                2
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-4 divide-y">
                                    {pedido.detalles?.map((detalle) => (
                                        <div
                                            key={detalle.id}
                                            className="flex items-center justify-between gap-4 py-3"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-800">
                                                    {detalle.stock?.producto
                                                        ?.nombre || "Producto"}
                                                </p>
                                                <p className="text-sm text-slate-500">
                                                    Cantidad: {detalle.cantidad}{" "}
                                                    | Precio: S/{" "}
                                                    {Number(
                                                        detalle.precio_unitario ||
                                                            0
                                                    ).toFixed(2)}
                                                </p>
                                            </div>
                                            <p className="font-bold text-slate-800">
                                                S/{" "}
                                                {Number(
                                                    detalle.subtotal || 0
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                    Método de pago:{" "}
                                    <span className="font-semibold">
                                        {pedido.metodo_pago ||
                                            "No especificado"}
                                    </span>
                                    {pedido.comprobante?.numero && (
                                        <span>
                                            {" "}
                                            | Comprobante:{" "}
                                            <strong>
                                                {pedido.comprobante.numero}
                                            </strong>
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 text-right font-bold text-blue-700">
                                    Ver detalle de compra
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white px-6 py-16 text-center shadow">
                        <p className="text-lg font-bold text-slate-700">
                            Todavía no tienes pedidos.
                        </p>
                        <p className="mt-1 text-slate-500">
                            Tus próximas compras aparecerán aquí.
                        </p>
                        <Link
                            to="/"
                            className="mt-5 inline-block rounded-lg bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-950"
                        >
                            Ver productos
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PedidosUsuario;
