import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";

const formatearFecha = (fecha) => {
    if (!fecha) return "";

    return new Intl.DateTimeFormat("es-PE", {
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date(fecha));
};

const PagosDetalles = () => {
    const { ventaId } = useParams();
    const navigate = useNavigate();
    const { productos } = useProductos();
    const [usuario] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );
    const [venta, setVenta] = useState(null);
    const [cantidadCarrito, setCantidadCarrito] = useState(0);
    const [busqueda, setBusqueda] = useState("");
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let activo = true;

        Promise.all([
            clienteAxios.get(`/mi-compras/${ventaId}`),
            clienteAxios.get("/mi-carrito"),
        ])
            .then(([respuestaVenta, respuestaCarrito]) => {
                if (!activo) return;

                setVenta(respuestaVenta.data.data);
                setCantidadCarrito(
                    new Set(
                        (
                            respuestaCarrito.data.data?.detalles || []
                        )
                            .map(
                                (detalle) =>
                                    detalle.stock?.producto?.id
                            )
                            .filter(Boolean)
                    ).size
                );
            })
            .catch((errorPeticion) => {
                if (!activo) return;

                if (errorPeticion.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    navigate("/");
                    return;
                }

                setError(
                    errorPeticion.response?.data?.message ||
                        "No se pudo cargar el detalle de la compra."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [navigate, ventaId]);

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

    const direccion =
        venta?.cliente?.persona?.direccion ||
        venta?.usuario?.persona?.direccion ||
        "Dirección no registrada";

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
                                    className="block px-4 py-3 hover:bg-blue-50 hover:text-blue-900"
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

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                {cargando ? (
                    <div className="rounded-2xl bg-white py-20 text-center text-slate-500 shadow">
                        Cargando detalle de la compra...
                    </div>
                ) : error ? (
                    <div className="rounded-2xl bg-white p-10 text-center shadow">
                        <p className="font-bold text-red-700">{error}</p>
                        <Link
                            to="/pedidos"
                            className="mt-5 inline-block rounded-lg bg-blue-900 px-5 py-3 font-bold text-white"
                        >
                            Ver mis pedidos
                        </Link>
                    </div>
                ) : (
                    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-5">
                            {venta?.detalles?.map((detalle) => {
                                const producto =
                                    detalle.stock?.producto || {};

                                return (
                                    <article
                                        key={detalle.id}
                                        className="flex gap-5 rounded-2xl bg-white p-6 shadow"
                                    >
                                        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-50">
                                            <img
                                                src={
                                                    producto.imagen
                                                        ? `http://127.0.0.1:8000/storage/${producto.imagen}`
                                                        : "https://via.placeholder.com/160x160?text=Sin+Imagen"
                                                }
                                                alt={producto.nombre}
                                                className="h-full w-full object-contain p-2"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <h2 className="text-xl font-bold text-blue-950">
                                                {producto.nombre}
                                            </h2>
                                            <p className="mt-2 text-slate-600">
                                                {detalle.cantidad} unidad
                                                {detalle.cantidad === 1
                                                    ? ""
                                                    : "es"}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500">
                                                {detalle.stock?.talla
                                                    ?.nombre && (
                                                    <span>
                                                        Talla:{" "}
                                                        {
                                                            detalle.stock
                                                                .talla.nombre
                                                        }
                                                    </span>
                                                )}
                                                {detalle.stock?.color
                                                    ?.nombre && (
                                                    <span>
                                                        Color:{" "}
                                                        {
                                                            detalle.stock
                                                                .color.nombre
                                                        }
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-3 font-bold text-blue-950">
                                                S/{" "}
                                                {Number(
                                                    detalle.subtotal
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </article>
                                );
                            })}

                            <section className="rounded-2xl bg-white p-7 shadow">
                                <p className="font-bold text-green-700">
                                    Compra confirmada
                                </p>
                                <h2 className="mt-2 text-2xl font-black text-blue-950">
                                    Te llegará el pedido en 3 días
                                </h2>
                                <p className="mt-4 text-lg text-slate-700">
                                    Enviaremos tu compra a:
                                </p>
                                <p className="mt-1 font-bold text-slate-900">
                                    {direccion}
                                </p>
                                <p className="mt-2 text-sm text-slate-500">
                                    Fecha estimada:{" "}
                                    {formatearFecha(
                                        venta?.fecha_estimada_entrega
                                    )}
                                </p>
                                <Link
                                    to="/"
                                    className="mt-6 inline-block rounded-lg bg-blue-100 px-5 py-3 font-bold text-blue-700 hover:bg-blue-200"
                                >
                                    Volver a comprar
                                </Link>
                            </section>

                            <section className="overflow-hidden rounded-2xl bg-white shadow">
                                <h3 className="border-b px-6 py-5 text-xl font-bold text-blue-950">
                                    Ayuda con la compra
                                </h3>
                                <Link
                                    to="/pedidos"
                                    className="block px-6 py-5 text-blue-700 hover:bg-blue-50"
                                >
                                    Tengo un problema con mi compra
                                </Link>
                            </section>
                        </div>

                        <aside className="rounded-2xl bg-white p-6 shadow">
                            <h3 className="text-xl font-bold text-blue-950">
                                Detalle de la compra
                            </h3>
                            <p className="mt-1 border-b pb-5 text-sm text-slate-500">
                                {formatearFecha(venta?.fecha)} | Pedido #
                                {String(venta?.id || "").padStart(8, "0")}
                            </p>
                            <div className="space-y-3 border-b py-5 text-slate-600">
                                <div className="flex justify-between">
                                    <span>Productos</span>
                                    <span>
                                        S/ {Number(venta?.total).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Envío</span>
                                    <span className="font-bold text-green-700">
                                        Gratis
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between py-5 text-xl font-black text-blue-950">
                                <span>Total</span>
                                <span>
                                    S/ {Number(venta?.total).toFixed(2)}
                                </span>
                            </div>
                            <div className="border-t pt-5">
                                <p className="font-bold text-slate-700">
                                    Medio de pago
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {venta?.metodo_pago}
                                </p>
                            </div>
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PagosDetalles;
