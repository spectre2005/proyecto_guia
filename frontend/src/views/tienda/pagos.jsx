import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";

const yapeInicial = { numero: "", token: "" };
const tarjetaInicial = {
    numero: "",
    titular: "",
    vencimiento: "",
    cvv: "",
    documento: "",
    cuotas: "1",
};

const entregaInicial = {
    nombre: "",
    apellido: "",
    telefono: "",
    direccion: "",
    email: "",
    dni: "",
    username: "",
};

const formatearTarjeta = (valor) =>
    valor
        .replace(/\D/g, "")
        .slice(0, 16)
        .replace(/(\d{4})(?=\d)/g, "$1 ");

const detectarMarca = (numero) => {
    const limpio = numero.replace(/\D/g, "");
    if (limpio.startsWith("4")) return "Visa Débito";
    if (/^(5[1-5]|2[2-7])/.test(limpio)) return "Mastercard";
    return "Tarjeta";
};

const Pagos = () => {
    const navigate = useNavigate();
    const { productos, obtenerProductos } = useProductos();
    const [usuario, setUsuario] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );
    const [carrito, setCarrito] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState("");
    const [modalMetodo, setModalMetodo] = useState(null);
    const [pagoCompletado, setPagoCompletado] = useState(false);
    const [compraFinalizada, setCompraFinalizada] = useState(null);
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [metodoSeleccionado, setMetodoSeleccionado] = useState("");
    const [yape, setYape] = useState(yapeInicial);
    const [yapeGuardado, setYapeGuardado] = useState(null);
    const [tarjeta, setTarjeta] = useState(tarjetaInicial);
    const [tarjetaGuardada, setTarjetaGuardada] = useState(null);
    const [entrega, setEntrega] = useState(entregaInicial);
    const [borradorEntrega, setBorradorEntrega] =
        useState(entregaInicial);
    const [modalEntrega, setModalEntrega] = useState(false);
    const [guardandoEntrega, setGuardandoEntrega] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        obtenerProductos();
    }, [obtenerProductos]);

    useEffect(() => {
        let activo = true;

        Promise.all([
            clienteAxios.get("/mi-carrito"),
            clienteAxios.get("/mi-cuenta"),
        ])
            .then(([respuestaCarrito, respuestaCuenta]) => {
                if (!activo) return;

                setCarrito(respuestaCarrito.data.data);

                const usuarioCuenta = respuestaCuenta.data.usuario;
                const persona = usuarioCuenta.persona || {};
                const datosEntrega = {
                    nombre: persona.nombre || "",
                    apellido: persona.apellido || "",
                    telefono: persona.telefono || "",
                    direccion: persona.direccion || "",
                    email: persona.email || "",
                    dni: persona.dni || "",
                    username: usuarioCuenta.username || "",
                };

                setUsuario(usuarioCuenta);
                setEntrega(datosEntrega);
                setBorradorEntrega(datosEntrega);
                localStorage.setItem(
                    "usuario",
                    JSON.stringify(usuarioCuenta)
                );
            })
            .catch((errorPeticion) => {
                if (!activo) return;

                if (errorPeticion.response?.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("usuario");
                    navigate("/carrito");
                    return;
                }

                setError(
                    errorPeticion.response?.data?.message ||
                        "No se pudo cargar el resumen de compra."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [navigate]);

    const detalles = useMemo(() => carrito?.detalles || [], [carrito]);
    const total = detalles.reduce(
        (suma, detalle) =>
            suma +
            Number(detalle.precio || 0) * Number(detalle.cantidad || 0),
        0
    );
    const cantidadProductos = new Set(
        detalles
            .map((detalle) => detalle.stock?.producto?.id)
            .filter(Boolean)
    ).size;

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

    const abrirMetodo = (metodo) => {
        setError("");
        setModalMetodo(metodo);
        if (metodo === "yape" && yapeGuardado) setYape(yapeGuardado);
        if (metodo === "tarjeta" && tarjetaGuardada) {
            setTarjeta(tarjetaGuardada);
        }
    };

    const guardarYape = (e) => {
        e.preventDefault();

        if (!/^9\d{8}$/.test(yape.numero)) {
            setError("Ingresa un número de Yape válido de 9 dígitos.");
            return;
        }
        if (!/^\d{6}$/.test(yape.token)) {
            setError("El token de compra debe tener 6 dígitos.");
            return;
        }

        setYapeGuardado({ ...yape });
        setMetodoSeleccionado("yape");
        setModalMetodo(null);
        setError("");
    };

    const guardarTarjeta = (e) => {
        e.preventDefault();
        const numeroLimpio = tarjeta.numero.replace(/\D/g, "");

        if (numeroLimpio.length !== 16) {
            setError("El número de tarjeta debe tener 16 dígitos.");
            return;
        }
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(tarjeta.vencimiento)) {
            setError("La fecha de vencimiento debe tener el formato MM/AA.");
            return;
        }
        if (!/^\d{3,4}$/.test(tarjeta.cvv)) {
            setError("El código de seguridad debe tener 3 o 4 dígitos.");
            return;
        }
        if (!/^\d{8}$/.test(tarjeta.documento)) {
            setError("Ingresa un DNI válido de 8 dígitos.");
            return;
        }

        setTarjetaGuardada({ ...tarjeta, numero: numeroLimpio });
        setMetodoSeleccionado("tarjeta");
        setModalMetodo(null);
        setError("");
    };

    const abrirModalEntrega = () => {
        setBorradorEntrega(entrega);
        setError("");
        setModalEntrega(true);
    };

    const guardarEntrega = async (e) => {
        e.preventDefault();
        setGuardandoEntrega(true);
        setError("");

        try {
            const { data } = await clienteAxios.put(
                "/mi-cuenta",
                borradorEntrega
            );
            const usuarioActualizado = data.usuario;
            const persona = usuarioActualizado.persona || {};
            const datosEntrega = {
                nombre: persona.nombre || "",
                apellido: persona.apellido || "",
                telefono: persona.telefono || "",
                direccion: persona.direccion || "",
                email: persona.email || "",
                dni: persona.dni || "",
                username: usuarioActualizado.username || "",
            };

            setUsuario(usuarioActualizado);
            setEntrega(datosEntrega);
            setBorradorEntrega(datosEntrega);
            setModalEntrega(false);
            localStorage.setItem(
                "usuario",
                JSON.stringify(usuarioActualizado)
            );
        } catch (errorPeticion) {
            const errores = errorPeticion.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setError(
                primerError ||
                    errorPeticion.response?.data?.message ||
                    "No se pudieron actualizar los datos de entrega."
            );
        } finally {
            setGuardandoEntrega(false);
        }
    };

    const continuarPago = async () => {
        const metodoValido =
            (metodoSeleccionado === "yape" && yapeGuardado) ||
            (metodoSeleccionado === "tarjeta" && tarjetaGuardada);

        if (!detalles.length) {
            setError("Tu carrito está vacío.");
            return;
        }
        if (!metodoValido) {
            setError("Selecciona y registra un medio de pago.");
            return;
        }
        if (!entrega.direccion.trim()) {
            setError("Agrega una dirección de entrega antes de continuar.");
            abrirModalEntrega();
            return;
        }

        setProcesandoPago(true);
        setError("");

        try {
            const referenciaPago =
                metodoSeleccionado === "yape"
                    ? yapeGuardado.numero.slice(-3)
                    : tarjetaGuardada.numero.slice(-4);
            const { data } = await clienteAxios.post(
                "/mi-compra/finalizar",
                {
                    metodo_pago: metodoSeleccionado,
                    referencia_pago: referenciaPago,
                }
            );

            setCompraFinalizada(data.data);
            setCarrito((carritoActual) => ({
                ...carritoActual,
                detalles: [],
            }));
            await obtenerProductos();
            setPagoCompletado(true);
        } catch (errorPeticion) {
            setError(
                errorPeticion.response?.data?.message ||
                    "No se pudo completar la compra."
            );
        } finally {
            setProcesandoPago(false);
        }
    };

    const ultimosTarjeta = tarjetaGuardada?.numero.slice(-4);
    const ultimosYape = yapeGuardado?.numero.slice(-3);

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
                        {cantidadProductos > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs text-white">
                                {cantidadProductos}
                            </span>
                        )}
                    </Link>
                </div>

                <NavegacionTienda />
            </header>

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
                <div className="mb-7 flex flex-wrap items-center gap-3">
                    <Link
                        to="/carrito"
                        className="font-bold text-blue-800 hover:underline"
                    >
                        Volver al carrito
                    </Link>
                    <span className="text-slate-400">/</span>
                    <h2 className="text-3xl font-bold text-blue-950">
                        Elige cómo pagar
                    </h2>
                </div>

                {error && !modalMetodo && (
                    <div className="mb-5 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                        {error}
                    </div>
                )}

                {cargando ? (
                    <div className="rounded-2xl bg-white py-20 text-center text-slate-500 shadow">
                        Cargando medios de pago...
                    </div>
                ) : (
                    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px]">
                        <div className="space-y-5">
                            <section className="overflow-hidden rounded-2xl bg-white shadow">
                                <button
                                    type="button"
                                    onClick={() => abrirMetodo("yape")}
                                    className="flex w-full items-center gap-4 border-b px-6 py-7 text-left hover:bg-purple-50"
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full border-2 ${
                                            metodoSeleccionado === "yape"
                                                ? "border-[6px] border-purple-700"
                                                : "border-slate-300"
                                        }`}
                                    />
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-700 font-black text-white">
                                        Y
                                    </span>
                                    <span className="flex-1">
                                        <span className="block text-lg font-bold">
                                            Yape
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {yapeGuardado
                                                ? `Yape ••• ••• ${ultimosYape}`
                                                : "Registra tu número y código de aprobación"}
                                        </span>
                                    </span>
                                    <span className="font-bold text-blue-700">
                                        {yapeGuardado
                                            ? "Editar"
                                            : "Agregar"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => abrirMetodo("tarjeta")}
                                    className="flex w-full items-center gap-4 px-6 py-7 text-left hover:bg-blue-50"
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full border-2 ${
                                            metodoSeleccionado ===
                                            "tarjeta"
                                                ? "border-[6px] border-blue-600"
                                                : "border-slate-300"
                                        }`}
                                    />
                                    <span className="flex h-12 w-12 items-center justify-center rounded-full border bg-white text-sm font-black italic text-blue-800">
                                        VISA
                                    </span>
                                    <span className="flex-1">
                                        <span className="block text-lg font-bold">
                                            Tarjeta de crédito o débito
                                        </span>
                                        <span className="text-sm text-slate-500">
                                            {tarjetaGuardada
                                                ? `${detectarMarca(tarjetaGuardada.numero)} •••• ${ultimosTarjeta}`
                                                : "Visa, Mastercard y otras tarjetas"}
                                        </span>
                                    </span>
                                    <span className="font-bold text-blue-700">
                                        {tarjetaGuardada
                                            ? "Editar"
                                            : "Agregar"}
                                    </span>
                                </button>
                            </section>

                            <section className="rounded-2xl bg-white p-6 shadow">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-blue-950">
                                            Dirección de entrega
                                        </h3>
                                        <p className="mt-4 font-bold text-slate-900">
                                            {entrega.nombre}{" "}
                                            {entrega.apellido}
                                            {entrega.telefono && (
                                                <span className="ml-5 font-normal">
                                                    +51 {entrega.telefono}
                                                </span>
                                            )}
                                        </p>
                                        <p className="mt-1 text-slate-600">
                                            {entrega.direccion ||
                                                "Todavía no registraste una dirección."}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={abrirModalEntrega}
                                        className="font-bold text-blue-600 hover:underline"
                                    >
                                        Modificar
                                    </button>
                                </div>

                                {!entrega.direccion && (
                                    <button
                                        type="button"
                                        onClick={abrirModalEntrega}
                                        className="mt-5 flex w-full items-center justify-between bg-orange-50 px-4 py-3 text-left text-sm text-orange-700"
                                    >
                                        <span>
                                            Por favor, actualiza tu dirección
                                            para recibir el pedido.
                                        </span>
                                        <span className="text-xl">›</span>
                                    </button>
                                )}
                            </section>
                        </div>

                        <aside className="rounded-2xl bg-white p-6 shadow">
                            <h3 className="border-b pb-4 text-xl font-bold text-blue-950">
                                Resumen de compra
                            </h3>
                            <div className="space-y-3 border-b py-5 text-slate-600">
                                <div className="flex justify-between">
                                    <span>Productos</span>
                                    <span>{cantidadProductos}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Envío</span>
                                    <span className="font-bold text-green-700">
                                        Gratis
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between py-5 text-xl font-black text-blue-950">
                                <span>Pagas</span>
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={continuarPago}
                                disabled={
                                    !detalles.length || procesandoPago
                                }
                                className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {procesandoPago
                                    ? "Procesando..."
                                    : "Continuar"}
                            </button>
                            <p className="mt-3 text-center text-xs text-slate-500">
                                Pago de demostración. No se realizará ningún
                                cargo real.
                            </p>
                        </aside>
                    </div>
                )}
            </main>

            {modalEntrega && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8">
                    <form
                        onSubmit={guardarEntrega}
                        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setModalEntrega(false);
                                setError("");
                            }}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-red-600"
                        >
                            ×
                        </button>
                        <h3 className="text-2xl font-bold text-blue-950">
                            Modificar dirección de entrega
                        </h3>
                        <p className="mb-5 mt-1 text-sm text-slate-500">
                            Estos datos también se actualizarán en tu perfil.
                        </p>

                        {error && (
                            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block font-semibold">
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={borradorEntrega.nombre}
                                    onChange={(e) =>
                                        setBorradorEntrega({
                                            ...borradorEntrega,
                                            nombre: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block font-semibold">
                                    Apellido
                                </label>
                                <input
                                    type="text"
                                    value={borradorEntrega.apellido}
                                    onChange={(e) =>
                                        setBorradorEntrega({
                                            ...borradorEntrega,
                                            apellido: e.target.value,
                                        })
                                    }
                                    required
                                    className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <label className="mb-2 mt-4 block font-semibold">
                            Teléfono
                        </label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={15}
                            value={borradorEntrega.telefono}
                            onChange={(e) =>
                                setBorradorEntrega({
                                    ...borradorEntrega,
                                    telefono: e.target.value.replace(
                                        /\D/g,
                                        ""
                                    ),
                                })
                            }
                            placeholder="946768431"
                            required
                            className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                        />

                        <label className="mb-2 mt-4 block font-semibold">
                            Dirección
                        </label>
                        <textarea
                            rows={3}
                            maxLength={255}
                            value={borradorEntrega.direccion}
                            onChange={(e) =>
                                setBorradorEntrega({
                                    ...borradorEntrega,
                                    direccion: e.target.value,
                                })
                            }
                            placeholder="Calle, número, distrito, provincia y referencia"
                            required
                            className="w-full resize-none rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                        />

                        <button
                            disabled={guardandoEntrega}
                            className="mt-5 w-full rounded-lg bg-blue-900 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                        >
                            {guardandoEntrega
                                ? "Guardando..."
                                : "Guardar datos de entrega"}
                        </button>
                    </form>
                </div>
            )}

            {modalMetodo === "yape" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <form
                        onSubmit={guardarYape}
                        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setModalMetodo(null);
                                setError("");
                            }}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-red-600"
                        >
                            ×
                        </button>
                        <p className="text-sm font-bold uppercase tracking-wide text-purple-700">
                            Pago simulado
                        </p>
                        <h3 className="text-2xl font-bold text-blue-950">
                            Pagar con Yape
                        </h3>
                        <p className="mb-5 mt-1 text-sm text-slate-500">
                            Ingresa datos ficticios para continuar.
                        </p>
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <label className="mb-2 block font-semibold">
                            Número de Yape
                        </label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={9}
                            value={yape.numero}
                            onChange={(e) =>
                                setYape({
                                    ...yape,
                                    numero: e.target.value.replace(/\D/g, ""),
                                })
                            }
                            placeholder="987654321"
                            required
                            className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600"
                        />
                        <label className="mb-2 block font-semibold">
                            Token de compra de Yape
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={yape.token}
                            onChange={(e) =>
                                setYape({
                                    ...yape,
                                    token: e.target.value.replace(/\D/g, ""),
                                })
                            }
                            placeholder="Token de 6 dígitos"
                            required
                            className="mb-5 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-purple-600"
                        />
                        <button className="w-full rounded-lg bg-purple-700 py-3 font-bold text-white hover:bg-purple-800">
                            Guardar Yape
                        </button>
                    </form>
                </div>
            )}

            {modalMetodo === "tarjeta" && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-8">
                    <form
                        onSubmit={guardarTarjeta}
                        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <button
                            type="button"
                            onClick={() => {
                                setModalMetodo(null);
                                setError("");
                            }}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-500 hover:text-red-600"
                        >
                            ×
                        </button>
                        <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                            Pago simulado
                        </p>
                        <h3 className="text-2xl font-bold text-blue-950">
                            Agregar tarjeta
                        </h3>
                        <p className="mb-5 mt-1 text-sm text-slate-500">
                            No ingreses datos de una tarjeta real.
                        </p>
                        {error && (
                            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <label className="mb-2 block font-semibold">
                            Número de tarjeta
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={19}
                            value={formatearTarjeta(tarjeta.numero)}
                            onChange={(e) =>
                                setTarjeta({
                                    ...tarjeta,
                                    numero: e.target.value.replace(/\D/g, ""),
                                })
                            }
                            placeholder="4111 1111 1111 1234"
                            required
                            className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <label className="mb-2 block font-semibold">
                            Nombre del titular
                        </label>
                        <input
                            type="text"
                            value={tarjeta.titular}
                            onChange={(e) =>
                                setTarjeta({
                                    ...tarjeta,
                                    titular: e.target.value.toUpperCase(),
                                })
                            }
                            placeholder="NOMBRE COMO APARECE EN LA TARJETA"
                            required
                            className="mb-4 w-full rounded-lg border px-4 py-3 uppercase outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block font-semibold">
                                    Vencimiento
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={5}
                                    value={tarjeta.vencimiento}
                                    onChange={(e) => {
                                        const limpio = e.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 4);
                                        setTarjeta({
                                            ...tarjeta,
                                            vencimiento:
                                                limpio.length > 2
                                                    ? `${limpio.slice(0, 2)}/${limpio.slice(2)}`
                                                    : limpio,
                                        });
                                    }}
                                    placeholder="MM/AA"
                                    required
                                    className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block font-semibold">
                                    CVV
                                </label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    maxLength={4}
                                    value={tarjeta.cvv}
                                    onChange={(e) =>
                                        setTarjeta({
                                            ...tarjeta,
                                            cvv: e.target.value.replace(
                                                /\D/g,
                                                ""
                                            ),
                                        })
                                    }
                                    placeholder="123"
                                    required
                                    className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-2 block font-semibold">
                                    DNI del titular
                                </label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={8}
                                    value={tarjeta.documento}
                                    onChange={(e) =>
                                        setTarjeta({
                                            ...tarjeta,
                                            documento: e.target.value.replace(
                                                /\D/g,
                                                ""
                                            ),
                                        })
                                    }
                                    placeholder="12345678"
                                    required
                                    className="mb-5 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                            <div>
                                <label className="mb-2 block font-semibold">
                                    Cuotas
                                </label>
                                <select
                                    value={tarjeta.cuotas}
                                    onChange={(e) =>
                                        setTarjeta({
                                            ...tarjeta,
                                            cuotas: e.target.value,
                                        })
                                    }
                                    className="mb-5 w-full rounded-lg border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-blue-600"
                                >
                                    <option value="1">1 cuota</option>
                                    <option value="3">3 cuotas</option>
                                    <option value="6">6 cuotas</option>
                                    <option value="12">12 cuotas</option>
                                </select>
                            </div>
                        </div>
                        <button className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700">
                            Guardar tarjeta
                        </button>
                    </form>
                </div>
            )}

            {pagoCompletado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl font-black text-green-700">
                            ✓
                        </div>
                        <h3 className="mt-5 text-3xl font-black text-blue-950">
                            Pago completado
                        </h3>
                        <p className="mt-2 text-slate-600">
                            La compra por S/{" "}
                            {Number(
                                compraFinalizada?.total || 0
                            ).toFixed(2)}{" "}
                            se registró correctamente.
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    `/pagos/detalles/${compraFinalizada.id}`
                                )
                            }
                            className="mt-6 w-full rounded-lg bg-blue-900 py-3 font-bold text-white hover:bg-blue-950"
                        >
                            Ver detalle de la compra
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Pagos;
