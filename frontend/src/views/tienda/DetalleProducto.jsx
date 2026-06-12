import { useEffect, useMemo, useState } from "react";
import {
    Link,
    useNavigate,
    useParams,
    useSearchParams,
} from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";
import {
    agregarAlCarritoInvitado,
    contarCarritoInvitado,
} from "../../utils/carritoInvitado";

const claveOpcion = (valor, respaldo) =>
    valor === null || valor === undefined ? respaldo : String(valor);

const SEMILLA_RECOMENDACIONES = Date.now() % 233280;

const ordenAleatorio = (id) =>
    (Number(id) * 9301 + SEMILLA_RECOMENDACIONES * 49297) % 233280;

const DetalleProducto = () => {
    const { productoId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const stockInicialId = searchParams.get("stock");
    const { productos, loading, obtenerProductos } = useProductos();
    const [usuario, setUsuario] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );
    const autenticado = Boolean(usuario && localStorage.getItem("token"));
    const [stockSeleccionadoId, setStockSeleccionadoId] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [cantidadCarrito, setCantidadCarrito] = useState(() =>
        autenticado ? 0 : contarCarritoInvitado()
    );
    const [cantidad, setCantidad] = useState(1);
    const [procesando, setProcesando] = useState(false);
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        obtenerProductos();
    }, [obtenerProductos]);

    const productoBase = useMemo(
        () =>
            productos.find(
                (producto) => String(producto.id) === String(productoId)
            ),
        [productoId, productos]
    );

    const productosMismoNombre = useMemo(() => {
        if (!productoBase) return [];
        const nombre = productoBase.nombre?.trim().toLowerCase();

        return productos.filter(
            (producto) => producto.nombre?.trim().toLowerCase() === nombre
        );
    }, [productoBase, productos]);

    const variantes = useMemo(
        () =>
            productosMismoNombre.flatMap((producto) =>
                (producto.stocks || []).map((stock) => ({
                    ...stock,
                    producto,
                }))
            ),
        [productosMismoNombre]
    );

    const variantesDisponibles = useMemo(
        () =>
            variantes.filter(
                (stock) => Number(stock.cantidad || 0) > 0
            ),
        [variantes]
    );

    const stockSeleccionado =
        variantesDisponibles.find(
            (stock) => String(stock.id) === String(stockSeleccionadoId)
        ) ||
        variantesDisponibles.find(
            (stock) => String(stock.id) === String(stockInicialId)
        ) ||
        variantesDisponibles.find(
            (stock) =>
                String(stock.producto?.id) === String(productoId)
        ) ||
        variantesDisponibles[0] ||
        null;

    useEffect(() => {
        if (!autenticado) return;
        let activo = true;

        Promise.all([
            clienteAxios.get("/mi-carrito"),
            clienteAxios.get("/mi-cuenta"),
        ])
            .then(([respuestaCarrito, respuestaCuenta]) => {
                if (!activo) return;

                setCantidadCarrito(
                    new Set(
                        (respuestaCarrito.data.data?.detalles || [])
                            .map(
                                (detalle) =>
                                    detalle.stock?.producto?.id
                            )
                            .filter(Boolean)
                    ).size
                );

                setUsuario(respuestaCuenta.data.usuario);
                localStorage.setItem(
                    "usuario",
                    JSON.stringify(respuestaCuenta.data.usuario)
                );
            })
            .catch(() => {});

        return () => {
            activo = false;
        };
    }, [autenticado]);

    const colores = useMemo(() => {
        const opciones = new Map();
        variantesDisponibles.forEach((stock) => {
            const id = claveOpcion(stock.color?.id, "sin-color");
            if (!opciones.has(id)) {
                opciones.set(id, {
                    id,
                    nombre: stock.color?.nombre || "Color único",
                    codigo: stock.color?.codigo_hex,
                    imagen: stock.producto?.imagen,
                    precio: stock.precio,
                });
            }
        });
        return [...opciones.values()];
    }, [variantesDisponibles]);

    const colorSeleccionado = claveOpcion(
        stockSeleccionado?.color?.id,
        "sin-color"
    );

    const tallasDisponibles = useMemo(() => {
        const opciones = new Map();
        variantesDisponibles
            .filter(
                (stock) =>
                    claveOpcion(stock.color?.id, "sin-color") ===
                    colorSeleccionado
            )
            .forEach((stock) => {
                const id = claveOpcion(stock.talla?.id, "sin-talla");
                if (!opciones.has(id)) {
                    opciones.set(id, {
                        id,
                        nombre: stock.talla?.nombre || "Talla única",
                    });
                }
            });
        return [...opciones.values()];
    }, [colorSeleccionado, variantesDisponibles]);

    const tallaSeleccionada = claveOpcion(
        stockSeleccionado?.talla?.id,
        "sin-talla"
    );

    const otrosProductos = useMemo(() => {
        if (!productoBase) return [];

        const nombreActual = productoBase.nombre?.trim().toLowerCase();
        const productosUnicos = new Map();

        productos.forEach((producto) => {
            const nombre = producto.nombre?.trim().toLowerCase();

            if (
                !nombre ||
                nombre === nombreActual ||
                producto.estado === false ||
                producto.estado === 0
            ) {
                return;
            }

            if (!productosUnicos.has(nombre)) {
                productosUnicos.set(nombre, producto);
            }
        });

        return [...productosUnicos.values()]
            .sort(
                (productoA, productoB) =>
                    ordenAleatorio(productoA.id) -
                    ordenAleatorio(productoB.id)
            )
            .slice(0, 10);
    }, [productoBase, productos]);

    const seleccionarColor = (colorId) => {
        const coincidencia =
            variantesDisponibles.find(
                (stock) =>
                    claveOpcion(stock.color?.id, "sin-color") ===
                        colorId &&
                    claveOpcion(stock.talla?.id, "sin-talla") ===
                        tallaSeleccionada
            ) ||
            variantesDisponibles.find(
                (stock) =>
                    claveOpcion(stock.color?.id, "sin-color") ===
                    colorId
            );

        setStockSeleccionadoId(coincidencia?.id || null);
        setCantidad(1);
    };

    const seleccionarTalla = (tallaId) => {
        const coincidencia = variantesDisponibles.find(
            (stock) =>
                claveOpcion(stock.color?.id, "sin-color") ===
                    colorSeleccionado &&
                claveOpcion(stock.talla?.id, "sin-talla") === tallaId
        );

        setStockSeleccionadoId(coincidencia?.id || null);
        setCantidad(1);
    };

    const agregarSeleccionado = async () => {
        if (!stockSeleccionado) {
            setMensaje("Esta combinación no tiene stock disponible.");
            return false;
        }

        setProcesando(true);
        setMensaje("");
        const cantidadSolicitada = Math.min(
            cantidad,
            Number(stockSeleccionado.cantidad)
        );

        try {
            if (!autenticado) {
                agregarAlCarritoInvitado(
                    stockSeleccionado.producto,
                    stockSeleccionado,
                    cantidadSolicitada
                );
                setCantidadCarrito(contarCarritoInvitado());
            } else {
                const { data } = await clienteAxios.post(
                    "/mi-carrito/items",
                    {
                        stocks_id: stockSeleccionado.id,
                        cantidad: cantidadSolicitada,
                    }
                );
                setCantidadCarrito(
                    new Set(
                        (data.data?.detalles || [])
                            .map(
                                (detalle) =>
                                    detalle.stock?.producto?.id
                            )
                            .filter(Boolean)
                    ).size
                );
            }

            setMensaje("Producto agregado al carrito.");
            return true;
        } catch (error) {
            setMensaje(
                error.response?.data?.message ||
                    error.message ||
                    "No se pudo agregar el producto."
            );
            return false;
        } finally {
            setProcesando(false);
        }
    };

    const comprarAhora = async () => {
        const agregado = await agregarSeleccionado();
        if (!agregado) return;

        if (autenticado) {
            navigate("/pagos");
            return;
        }

        localStorage.setItem("redirect_despues_login", "/pagos");
        navigate("/?login=1");
    };

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

    if (loading) {
        return <p className="p-8 text-center">Cargando producto...</p>;
    }

    if (!productoBase) {
        return (
            <div className="p-10 text-center">
                <p className="text-xl font-bold">Producto no encontrado.</p>
                <Link to="/" className="mt-4 inline-block text-blue-700">
                    Volver a la tienda
                </Link>
            </div>
        );
    }

    const productoVisible =
        stockSeleccionado?.producto || productoBase;
    const persona = usuario?.persona || {};
    const stockMaximo = Number(stockSeleccionado?.cantidad || 0);
    const cantidadSeleccionada = Math.min(cantidad, stockMaximo || 1);

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
                        className="flex flex-1 rounded-xl border-2 border-yellow-400 bg-white p-1 shadow-lg"
                    >
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar jeans, polos, casacas..."
                            className="w-full rounded-l-lg px-5 py-3 text-gray-800 outline-none"
                        />
                        <button className="rounded-lg bg-yellow-400 px-6 font-bold text-blue-950 hover:bg-yellow-500">
                            Buscar
                        </button>
                    </form>

                    {!autenticado ? (
                        <div className="flex shrink-0 items-center gap-3">
                            <Link
                                to="/?login=1"
                                className="font-semibold hover:text-yellow-300"
                            >
                                Iniciar sesión
                            </Link>
                            <Link
                                to="/?registro=1"
                                className="rounded-lg bg-white px-4 py-2 font-bold text-blue-950 hover:bg-blue-100"
                            >
                                Registrarse
                            </Link>
                        </div>
                    ) : (
                        <div className="group relative shrink-0 py-2">
                            <button
                                type="button"
                                className="rounded-lg px-3 py-1 text-right hover:bg-blue-900"
                            >
                                <span className="block text-sm text-blue-200">
                                    Bienvenido
                                </span>
                                <span className="block font-bold">
                                    {usuario.username} ▾
                                </span>
                            </button>
                            <div className="absolute right-0 top-full z-40 hidden w-64 pt-2 group-hover:block group-focus-within:block">
                                <div className="overflow-hidden rounded-xl border bg-white py-2 text-slate-700 shadow-2xl">
                                    <Link
                                        to="/perfil"
                                        className="block px-4 py-3 hover:bg-blue-50"
                                    >
                                        Mi cuenta
                                    </Link>
                                    <Link
                                        to="/pedidos"
                                        className="block px-4 py-3 hover:bg-blue-50"
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
                    )}

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
                <Link
                    to="/"
                    className="mb-5 inline-block font-bold text-blue-700 hover:underline"
                >
                    Volver a productos
                </Link>

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="grid gap-8 rounded-2xl bg-white p-6 shadow-lg lg:grid-cols-2">
                    <div className="flex min-h-500px items-center justify-center rounded-xl bg-blue-50">
                        <img
                            src={
                                productoVisible.imagen
                                    ? `http://127.0.0.1:8000/storage/${productoVisible.imagen}`
                                    : "https://via.placeholder.com/600x600?text=Sin+Imagen"
                            }
                            alt={productoVisible.nombre}
                            className="max-h-500px w-full object-contain p-8"
                        />
                    </div>

                    <section className="flex flex-col">
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                            {productoVisible.marca?.nombre ||
                                "Novedades Fernando"}
                        </p>
                        <h1 className="mt-2 text-4xl font-black text-blue-950">
                            {productoVisible.nombre}
                        </h1>
                        <h2 className="mt-5 text-lg font-bold text-slate-900">
                            Descripción
                        </h2>
                        <p className="mt-1 text-slate-600">
                            {productoVisible.descripcion ||
                                "Producto disponible en nuestra tienda."}
                        </p>
                        <p className="mt-6 text-4xl font-black text-blue-950">
                            S/{" "}
                            {Number(
                                stockSeleccionado?.precio || 0
                            ).toFixed(2)}
                        </p>
                        <p className="mt-2 font-bold text-green-700">
                            Envío gratis
                        </p>

                        {colores.length > 1 && (
                            <div className="mt-7">
                                <h2 className="font-bold text-slate-800">
                                    Color:{" "}
                                    <span className="font-normal">
                                        {stockSeleccionado?.color?.nombre ||
                                            "Único"}
                                    </span>
                                </h2>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {colores.map((color) => (
                                        <button
                                            key={color.id}
                                            type="button"
                                            onClick={() =>
                                                seleccionarColor(color.id)
                                            }
                                            className={`w-24 overflow-hidden rounded-lg border-2 bg-white text-left transition ${
                                                colorSeleccionado ===
                                                color.id
                                                    ? "border-blue-700 shadow-md"
                                                    : "border-slate-300 hover:border-blue-500"
                                            }`}
                                        >
                                            <span className="flex h-20 items-center justify-center bg-slate-50">
                                                <img
                                                    src={
                                                        color.imagen
                                                            ? `http://127.0.0.1:8000/storage/${color.imagen}`
                                                            : "https://via.placeholder.com/100x100?text=Sin+Imagen"
                                                    }
                                                    alt={color.nombre}
                                                    className="h-full w-full object-contain p-1"
                                                />
                                            </span>
                                            <span className="block truncate px-2 pt-2 text-xs font-bold">
                                                {color.nombre}
                                            </span>
                                            <span className="block px-2 pb-2 text-xs text-slate-600">
                                                S/{" "}
                                                {Number(
                                                    color.precio
                                                ).toFixed(2)}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {tallasDisponibles.length > 1 && (
                            <div className="mt-7">
                                <h2 className="font-bold text-slate-800">
                                    Talla:{" "}
                                    <span className="font-normal">
                                        {stockSeleccionado?.talla?.nombre ||
                                            "Única"}
                                    </span>
                                </h2>
                                <div className="mt-3 flex flex-wrap gap-3">
                                    {tallasDisponibles.map((talla) => (
                                        <button
                                            key={talla.id}
                                            type="button"
                                            onClick={() =>
                                                seleccionarTalla(talla.id)
                                            }
                                            className={`min-w-16 rounded-lg border-2 px-4 py-2 font-bold ${
                                                tallaSeleccionada ===
                                                talla.id
                                                    ? "border-blue-800 bg-blue-800 text-white"
                                                    : "border-slate-300 hover:border-blue-700"
                                            }`}
                                        >
                                            {talla.nombre}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-7 rounded-xl bg-slate-50 p-4">
                            <p className="font-bold text-slate-800">
                                Variante seleccionada
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                                Talla:{" "}
                                {stockSeleccionado?.talla?.nombre ||
                                    "Única"}{" "}
                                | Color:{" "}
                                {stockSeleccionado?.color?.nombre ||
                                    "Único"}
                            </p>
                            <p className="mt-2 font-bold">
                                Stock disponible:{" "}
                                <span
                                    className={
                                        stockSeleccionado
                                            ? "text-green-700"
                                            : "text-red-600"
                                    }
                                >
                                    {Number(
                                        stockSeleccionado?.cantidad || 0
                                    )}
                                </span>
                            </p>
                        </div>

                    </section>
                    </div>

                    <aside className="sticky top-5 rounded-2xl border border-slate-300 bg-white p-6 shadow-lg">
                        <p className="text-3xl font-black text-blue-950">
                            S/{" "}
                            {Number(
                                stockSeleccionado?.precio || 0
                            ).toFixed(2)}
                        </p>
                        <p className="mt-5 text-slate-700">
                            Entrega{" "}
                            <strong className="text-slate-950">
                                GRATIS en 3 días
                            </strong>
                        </p>

                        {autenticado ? (
                            <div className="mt-5 space-y-2 text-sm text-slate-600">
                                <p className="font-bold text-blue-700">
                                    Enviar a{" "}
                                    {persona.nombre || usuario?.username}
                                    {persona.apellido
                                        ? ` ${persona.apellido}`
                                        : ""}
                                </p>
                                <p>
                                    {persona.direccion ||
                                        "Agrega una dirección desde tu perfil."}
                                </p>
                                {persona.telefono && (
                                    <p>
                                        Teléfono: +51 {persona.telefono}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/?login=1"
                                className="mt-5 block font-bold text-blue-700 hover:underline"
                            >
                                Inicia sesión para ver tu dirección de
                                entrega
                            </Link>
                        )}

                        <p className="mt-6 text-xl font-bold text-green-700">
                            {stockSeleccionado
                                ? "Disponible"
                                : "Sin stock"}
                        </p>

                        <label className="mt-4 block text-sm font-semibold text-slate-700">
                            Cantidad
                            <input
                                type="number"
                                min={1}
                                max={stockMaximo}
                                value={cantidadSeleccionada}
                                onChange={(e) =>
                                    setCantidad(
                                        Math.max(
                                            1,
                                            Math.min(
                                                Number(
                                                    e.target.value
                                                ) || 1,
                                                stockMaximo
                                            )
                                        )
                                    )
                                }
                                disabled={!stockMaximo}
                                className="mt-2 w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2"
                            />
                        </label>

                        {mensaje && (
                            <div className="mt-5 rounded-lg bg-blue-100 px-4 py-3 text-sm text-blue-800">
                                {mensaje}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={agregarSeleccionado}
                            disabled={!stockSeleccionado || procesando}
                            className="mt-6 w-full rounded-full bg-yellow-400 py-3 font-bold text-blue-950 hover:bg-yellow-500 disabled:opacity-50"
                        >
                            {procesando
                                ? "Agregando..."
                                : "Agregar al carrito"}
                        </button>
                        <button
                            type="button"
                            onClick={comprarAhora}
                            disabled={!stockSeleccionado || procesando}
                            className="mt-3 w-full rounded-full bg-orange-400 py-3 font-bold text-blue-950 hover:bg-orange-500 disabled:opacity-50"
                        >
                            Comprar ahora
                        </button>
                    </aside>
                </div>

                {!!otrosProductos.length && (
                    <section className="mt-8 rounded-2xl bg-white p-6 shadow">
                        <h2 className="text-2xl font-bold text-blue-950">
                            Otros productos
                        </h2>
                        <p className="mt-1 text-slate-500">
                            También podrían interesarte estas opciones.
                        </p>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                            {otrosProductos.map((producto) => {
                                const stocksDisponibles = (
                                    producto.stocks || []
                                ).filter(
                                    (stock) =>
                                        Number(stock.cantidad || 0) > 0
                                );
                                const stock = stocksDisponibles[0];
                                const stockTotal =
                                    stocksDisponibles.reduce(
                                        (total, item) =>
                                            total +
                                            Number(
                                                item.cantidad || 0
                                            ),
                                        0
                                    );

                                return (
                                    <Link
                                        key={producto.id}
                                        to={`/productos/${producto.id}`}
                                        className="overflow-hidden rounded-xl border bg-white transition hover:-translate-y-1 hover:shadow-lg"
                                    >
                                        <div className="flex h-44 items-center justify-center bg-blue-50">
                                            <img
                                                src={
                                                    producto.imagen
                                                        ? `http://127.0.0.1:8000/storage/${producto.imagen}`
                                                        : "https://via.placeholder.com/220x220?text=Sin+Imagen"
                                                }
                                                alt={producto.nombre}
                                                className="h-full w-full object-contain p-3"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <h3 className="line-clamp-2 font-bold text-slate-900">
                                                {producto.nombre}
                                            </h3>
                                            <p className="mt-2 text-xl font-black text-blue-950">
                                                S/{" "}
                                                {Number(
                                                    stock?.precio || 0
                                                ).toFixed(2)}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Stock: {stockTotal}
                                            </p>
                                            <p className="mt-2 text-sm font-bold text-green-700">
                                                Envío gratis
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default DetalleProducto;
