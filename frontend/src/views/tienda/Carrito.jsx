import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";
import {
    actualizarCarritoInvitado,
    eliminarDelCarritoInvitado,
    fusionarCarritoInvitado,
    obtenerCarritoInvitado,
    vaciarCarritoInvitado,
} from "../../utils/carritoInvitado";

const Carrito = () => {
    const navigate = useNavigate();
    const { productos } = useProductos();
    const [usuario, setUsuario] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );
    const autenticado = Boolean(usuario && localStorage.getItem("token"));
    const [carrito, setCarrito] = useState(() =>
        autenticado
            ? null
            : { detalles: obtenerCarritoInvitado() }
    );
    const [cargando, setCargando] = useState(autenticado);
    const [procesando, setProcesando] = useState(null);
    const [mensaje, setMensaje] = useState("");
    const [mensajeTipo, setMensajeTipo] = useState("error");
    const [busqueda, setBusqueda] = useState("");
    const [modalCuenta, setModalCuenta] = useState(null);
    const [loginForm, setLoginForm] = useState({
        username: "",
        password: "",
    });
    const [registroForm, setRegistroForm] = useState({
        nombre: "",
        apellido: "",
        email: "",
        username: "",
        password: "",
    });
    const [recuperacionForm, setRecuperacionForm] = useState({
        email: "",
        codigo: "",
        password: "",
        password_confirmation: "",
    });
    const [recuperacionPaso, setRecuperacionPaso] = useState("email");
    const [iniciandoSesion, setIniciandoSesion] = useState(false);
    const [errorLogin, setErrorLogin] = useState("");
    const [mensajeCuenta, setMensajeCuenta] = useState("");
    const [mensajeCuentaTipo, setMensajeCuentaTipo] = useState("error");

    useEffect(() => {
        if (!autenticado) return;

        let activo = true;

        clienteAxios
            .get("/mi-carrito")
            .then(({ data }) => {
                if (activo) setCarrito(data.data);
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
                        "No se pudo cargar el carrito."
                );
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => {
            activo = false;
        };
    }, [autenticado, navigate]);

    const detalles = useMemo(
        () => carrito?.detalles || [],
        [carrito]
    );

    const total = detalles.reduce(
        (acumulado, detalle) =>
            acumulado +
            Number(detalle.precio || 0) * Number(detalle.cantidad || 0),
        0
    );

    const cantidadUnidades = detalles.reduce(
        (acumulado, detalle) =>
            acumulado + Number(detalle.cantidad || 0),
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
                [producto.nombre, producto.descripcion]
                    .filter(Boolean)
                    .some((valor) => valor.toLowerCase().includes(texto))
            )
            .slice(0, 6);
    }, [busqueda, productos]);

    const actualizarCantidad = async (detalle, cantidad) => {
        if (cantidad < 1 || cantidad > detalle.stock.cantidad) return;

        setProcesando(detalle.id);
        setMensaje("");

        try {
            if (!autenticado) {
                const nuevosDetalles = actualizarCarritoInvitado(
                    detalle.stocks_id,
                    cantidad
                );
                setCarrito({ detalles: nuevosDetalles });
                return;
            }

            const { data } = await clienteAxios.put(
                `/mi-carrito/items/${detalle.id}`,
                { cantidad }
            );
            setCarrito(data.data);
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message ||
                    "No se pudo actualizar la cantidad."
            );
        } finally {
            setProcesando(null);
        }
    };

    const eliminarProducto = async (detalle) => {
        setProcesando(detalle.id);
        setMensaje("");

        try {
            if (!autenticado) {
                const nuevosDetalles = eliminarDelCarritoInvitado(
                    detalle.stocks_id
                );
                setCarrito({ detalles: nuevosDetalles });
                setMensajeTipo("success");
                setMensaje("Producto eliminado del carrito.");
                return;
            }

            const { data } = await clienteAxios.delete(
                `/mi-carrito/items/${detalle.id}`
            );
            setCarrito(data.data);
            setMensajeTipo("success");
            setMensaje(data.message);
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message ||
                    "No se pudo eliminar el producto."
            );
        } finally {
            setProcesando(null);
        }
    };

    const vaciarCarrito = async () => {
        setProcesando("vaciar");
        setMensaje("");

        try {
            if (!autenticado) {
                setCarrito({
                    detalles: vaciarCarritoInvitado(),
                });
                setMensajeTipo("success");
                setMensaje("Carrito vaciado correctamente.");
                return;
            }

            const { data } = await clienteAxios.delete("/mi-carrito");
            setCarrito(data.data);
            setMensajeTipo("success");
            setMensaje(data.message);
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message ||
                    "No se pudo vaciar el carrito."
            );
        } finally {
            setProcesando(null);
        }
    };

    const continuarCompra = () => {
        if (!autenticado) {
            setErrorLogin("");
            setModalCuenta("login");
            return;
        }

        navigate("/pagos");
    };

    const iniciarSesion = async (e) => {
        e.preventDefault();
        setIniciandoSesion(true);
        setErrorLogin("");

        try {
            const { data } = await clienteAxios.post("/login", loginForm);

            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));

            await fusionarCarritoInvitado(clienteAxios);
            const respuestaCarrito = await clienteAxios.get("/mi-carrito");

            setUsuario(data.usuario);
            setCarrito(respuestaCarrito.data.data);
            setModalCuenta(null);
            setLoginForm({
                username: "",
                password: "",
            });
            setMensajeTipo("success");
            setMensaje(
                "Sesión iniciada. Tus productos permanecen en el carrito."
            );
        } catch (error) {
            setMensajeCuentaTipo("error");
            setErrorLogin(
                error.response?.data?.message ||
                    "No se pudo iniciar sesión."
            );
        } finally {
            setIniciandoSesion(false);
        }
    };

    const registrarUsuario = async (e) => {
        e.preventDefault();
        setIniciandoSesion(true);
        setMensajeCuenta("");

        try {
            const { data } = await clienteAxios.post(
                "/register",
                registroForm
            );

            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));

            await fusionarCarritoInvitado(clienteAxios);
            const respuestaCarrito = await clienteAxios.get("/mi-carrito");

            setUsuario(data.usuario);
            setCarrito(respuestaCarrito.data.data);
            setModalCuenta(null);
            setRegistroForm({
                nombre: "",
                apellido: "",
                email: "",
                username: "",
                password: "",
            });
            setMensajeTipo("success");
            setMensaje(
                "Cuenta creada. Tus productos permanecen en el carrito."
            );
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeCuentaTipo("error");
            setMensajeCuenta(
                primerError ||
                    error.response?.data?.message ||
                    "No se pudo crear la cuenta."
            );
        } finally {
            setIniciandoSesion(false);
        }
    };

    const solicitarRecuperacion = async (e) => {
        e.preventDefault();
        setIniciandoSesion(true);
        setMensajeCuenta("");

        try {
            const { data } = await clienteAxios.post(
                "/recuperar-password",
                { email: recuperacionForm.email }
            );

            setRecuperacionPaso("codigo");
            setMensajeCuentaTipo("info");
            setMensajeCuenta(
                `Simulación de correo: tu código es ${data.codigo_simulado}. Vence en ${data.expira_en_minutos} minutos.`
            );
        } catch (error) {
            setMensajeCuentaTipo("error");
            setMensajeCuenta(
                error.response?.data?.message ||
                    "No se pudo simular el envío del correo."
            );
        } finally {
            setIniciandoSesion(false);
        }
    };

    const restablecerPassword = async (e) => {
        e.preventDefault();
        setIniciandoSesion(true);
        setMensajeCuenta("");

        try {
            const { data } = await clienteAxios.post(
                "/restablecer-password",
                recuperacionForm
            );

            setRecuperacionForm({
                email: "",
                codigo: "",
                password: "",
                password_confirmation: "",
            });
            setRecuperacionPaso("email");
            setModalCuenta("login");
            setMensajeCuentaTipo("success");
            setMensajeCuenta(data.message);
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeCuentaTipo("error");
            setMensajeCuenta(
                primerError ||
                    error.response?.data?.message ||
                    "No se pudo cambiar la contraseña."
            );
        } finally {
            setIniciandoSesion(false);
        }
    };

    const cambiarVistaCuenta = (vista) => {
        setErrorLogin("");
        setMensajeCuenta("");
        setMensajeCuentaTipo("error");
        setRecuperacionPaso("email");
        setModalCuenta(vista);
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
            // Se limpia la sesión local incluso si el token ya expiró.
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

                    {!autenticado ? (
                        <div className="flex shrink-0 items-center gap-3">
                            <button
                                type="button"
                                onClick={() => cambiarVistaCuenta("login")}
                                className="font-semibold hover:text-yellow-300"
                            >
                                Iniciar sesión
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    cambiarVistaCuenta("registro")
                                }
                                className="rounded-lg bg-white px-4 py-2 font-bold text-blue-950 hover:bg-blue-100"
                            >
                                Registrarse
                            </button>
                        </div>
                    ) : (
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
                    )}

                    <Link
                        to="/carrito"
                        onClick={() => window.scrollTo({ top: 0 })}
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
                <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-blue-950">
                            Carrito de compras
                        </h2>
                    </div>

                    {!!detalles.length && (
                        <button
                            type="button"
                            onClick={vaciarCarrito}
                            disabled={procesando === "vaciar"}
                            className="font-bold text-red-600 hover:underline disabled:opacity-50"
                        >
                            Vaciar carrito
                        </button>
                    )}
                </div>

                {mensaje && (
                    <div
                        className={`mb-5 rounded-lg px-4 py-3 ${
                            mensajeTipo === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {mensaje}
                    </div>
                )}

                {cargando ? (
                    <div className="rounded-2xl bg-white py-20 text-center text-slate-500 shadow">
                        Cargando carrito...
                    </div>
                ) : detalles.length ? (
                    <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
                        <section className="space-y-4">
                            {detalles.map((detalle) => {
                                const producto = detalle.stock?.producto || {};
                                const subtotal =
                                    Number(detalle.precio || 0) *
                                    Number(detalle.cantidad || 0);
                                const estaProcesando =
                                    procesando === detalle.id;

                                return (
                                    <article
                                        key={detalle.id}
                                        className="flex flex-col gap-5 rounded-2xl bg-white p-5 shadow sm:flex-row"
                                    >
                                        <div className="flex h-40 w-full shrink-0 items-center justify-center rounded-xl bg-blue-50 sm:w-40">
                                            <img
                                                src={
                                                    producto.imagen
                                                        ? `http://127.0.0.1:8000/storage/${producto.imagen}`
                                                        : "https://via.placeholder.com/240x240?text=Sin+Imagen"
                                                }
                                                alt={producto.nombre}
                                                className="h-full w-full object-contain p-3"
                                            />
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-blue-950">
                                                    {producto.nombre}
                                                </h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    Talla:{" "}
                                                    {detalle.stock?.talla
                                                        ?.nombre || "Única"}{" "}
                                                    | Color:{" "}
                                                    {detalle.stock?.color
                                                        ?.nombre || "Único"}
                                                </p>
                                                <p className="mt-2 font-bold text-slate-800">
                                                    S/{" "}
                                                    {Number(
                                                        detalle.precio || 0
                                                    ).toFixed(2)}{" "}
                                                    c/u
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center overflow-hidden rounded-lg border">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            actualizarCantidad(
                                                                detalle,
                                                                detalle.cantidad -
                                                                    1
                                                            )
                                                        }
                                                        disabled={
                                                            estaProcesando ||
                                                            detalle.cantidad <=
                                                                1
                                                        }
                                                        className="h-10 w-11 text-xl font-bold hover:bg-slate-100 disabled:text-slate-300"
                                                    >
                                                        −
                                                    </button>
                                                    <span className="flex h-10 min-w-12 items-center justify-center border-x font-bold">
                                                        {detalle.cantidad}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            actualizarCantidad(
                                                                detalle,
                                                                detalle.cantidad +
                                                                    1
                                                            )
                                                        }
                                                        disabled={
                                                            estaProcesando ||
                                                            detalle.cantidad >=
                                                                detalle.stock
                                                                    .cantidad
                                                        }
                                                        className="h-10 w-11 text-xl font-bold hover:bg-slate-100 disabled:text-slate-300"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        eliminarProducto(
                                                            detalle
                                                        )
                                                    }
                                                    disabled={estaProcesando}
                                                    className="font-bold text-red-600 hover:underline disabled:opacity-50"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>

                                            <p className="text-sm text-slate-500">
                                                Stock disponible:{" "}
                                                {detalle.stock?.cantidad}
                                            </p>
                                        </div>

                                        <p className="text-right text-2xl font-black text-blue-950">
                                            S/ {subtotal.toFixed(2)}
                                        </p>
                                    </article>
                                );
                            })}
                        </section>

                        <aside className="h-fit rounded-2xl bg-white p-6 shadow lg:sticky lg:top-6">
                            <h3 className="text-xl font-bold text-blue-950">
                                Resumen
                            </h3>
                            <div className="mt-5 space-y-3 border-b pb-5 text-slate-600">
                                <div className="flex justify-between">
                                    <span>Productos</span>
                                    <span>{cantidadProductos}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Unidades</span>
                                    <span>{cantidadUnidades}</span>
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
                                <span>S/ {total.toFixed(2)}</span>
                            </div>
                            <button
                                type="button"
                                onClick={continuarCompra}
                                className="w-full rounded-lg bg-yellow-400 py-3 font-bold text-blue-950 hover:bg-yellow-500"
                            >
                                Pagar ahora
                            </button>
                        </aside>
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white px-6 py-20 text-center shadow">
                        <p className="text-2xl font-bold text-blue-950">
                            Tu carrito está vacío
                        </p>
                        <p className="mt-2 text-slate-500">
                            Agrega productos desde la tienda para verlos aquí.
                        </p>
                        <Link
                            to="/"
                            className="mt-6 inline-block rounded-lg bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-950"
                        >
                            Ver productos
                        </Link>
                    </div>
                )}
            </main>

            {modalCuenta && (
                <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60 px-4">
                    <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setModalCuenta(null)}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-400 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h2 className="text-center text-2xl font-bold text-blue-950">
                            {modalCuenta === "login"
                                ? "Iniciar sesión"
                                : modalCuenta === "registro"
                                  ? "Crear cuenta"
                                  : "Recuperar contraseña"}
                        </h2>
                        <p className="mb-5 mt-2 text-center text-slate-500">
                            {modalCuenta === "login"
                                ? "Ingresa para continuar. Tu carrito no se perderá."
                                : modalCuenta === "registro"
                                  ? "Regístrate sin salir de tu carrito."
                                  : recuperacionPaso === "email"
                                    ? "Simularemos el envío de un código."
                                    : "Ingresa el código y tu nueva contraseña."}
                        </p>

                        {(errorLogin || mensajeCuenta) && (
                            <div
                                className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                                    mensajeCuentaTipo === "success"
                                        ? "bg-green-100 text-green-700"
                                        : mensajeCuentaTipo === "info"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-red-100 text-red-700"
                                }`}
                            >
                                {errorLogin || mensajeCuenta}
                            </div>
                        )}

                        {modalCuenta === "login" ? (
                            <>
                                <form onSubmit={iniciarSesion}>
                                    <input
                                        type="text"
                                        placeholder="Usuario"
                                        value={loginForm.username}
                                        onChange={(e) =>
                                            setLoginForm({
                                                ...loginForm,
                                                username: e.target.value,
                                            })
                                        }
                                        required
                                        className="mb-3 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Contraseña"
                                        value={loginForm.password}
                                        onChange={(e) =>
                                            setLoginForm({
                                                ...loginForm,
                                                password: e.target.value,
                                            })
                                        }
                                        required
                                        className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                    <button
                                        disabled={iniciandoSesion}
                                        className="w-full rounded-lg bg-blue-900 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                                    >
                                        {iniciandoSesion
                                            ? "Ingresando..."
                                            : "Iniciar sesión"}
                                    </button>
                                </form>

                                <button
                                    type="button"
                                    onClick={() =>
                                        cambiarVistaCuenta("recuperacion")
                                    }
                                    className="mt-4 block w-full text-center text-sm font-bold text-blue-800 hover:underline"
                                >
                                    Olvidé mi contraseña
                                </button>
                                <p className="mt-4 text-center text-sm text-slate-600">
                                    ¿No tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            cambiarVistaCuenta("registro")
                                        }
                                        className="font-bold text-blue-800 hover:underline"
                                    >
                                        Regístrate
                                    </button>
                                </p>
                            </>
                        ) : modalCuenta === "registro" ? (
                            <form onSubmit={registrarUsuario}>
                                {[
                                    ["nombre", "Nombre", "text"],
                                    ["apellido", "Apellido", "text"],
                                    ["email", "Correo electrónico", "email"],
                                    ["username", "Usuario", "text"],
                                    ["password", "Contraseña", "password"],
                                ].map(([campo, placeholder, tipo]) => (
                                    <input
                                        key={campo}
                                        type={tipo}
                                        placeholder={placeholder}
                                        value={registroForm[campo]}
                                        onChange={(e) =>
                                            setRegistroForm({
                                                ...registroForm,
                                                [campo]: e.target.value,
                                            })
                                        }
                                        required
                                        className="mb-3 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                ))}
                                <button
                                    disabled={iniciandoSesion}
                                    className="w-full rounded-lg bg-blue-900 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                                >
                                    {iniciandoSesion
                                        ? "Creando cuenta..."
                                        : "Crear cuenta"}
                                </button>
                                <p className="mt-4 text-center text-sm text-slate-600">
                                    ¿Ya tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            cambiarVistaCuenta("login")
                                        }
                                        className="font-bold text-blue-800 hover:underline"
                                    >
                                        Inicia sesión
                                    </button>
                                </p>
                            </form>
                        ) : (
                            <form
                                onSubmit={
                                    recuperacionPaso === "email"
                                        ? solicitarRecuperacion
                                        : restablecerPassword
                                }
                            >
                                <input
                                    type="email"
                                    placeholder="Correo electrónico registrado"
                                    value={recuperacionForm.email}
                                    onChange={(e) =>
                                        setRecuperacionForm({
                                            ...recuperacionForm,
                                            email: e.target.value,
                                        })
                                    }
                                    readOnly={recuperacionPaso === "codigo"}
                                    required
                                    className="mb-3 w-full rounded-lg border px-4 py-3 outline-none read-only:bg-slate-100 focus:ring-2 focus:ring-blue-700"
                                />

                                {recuperacionPaso === "codigo" && (
                                    <>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={6}
                                            placeholder="Código de 6 dígitos"
                                            value={recuperacionForm.codigo}
                                            onChange={(e) =>
                                                setRecuperacionForm({
                                                    ...recuperacionForm,
                                                    codigo: e.target.value.replace(
                                                        /\D/g,
                                                        ""
                                                    ),
                                                })
                                            }
                                            required
                                            className="mb-3 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Nueva contraseña"
                                            value={recuperacionForm.password}
                                            onChange={(e) =>
                                                setRecuperacionForm({
                                                    ...recuperacionForm,
                                                    password: e.target.value,
                                                })
                                            }
                                            minLength={6}
                                            required
                                            className="mb-3 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                        <input
                                            type="password"
                                            placeholder="Confirmar contraseña"
                                            value={
                                                recuperacionForm.password_confirmation
                                            }
                                            onChange={(e) =>
                                                setRecuperacionForm({
                                                    ...recuperacionForm,
                                                    password_confirmation:
                                                        e.target.value,
                                                })
                                            }
                                            minLength={6}
                                            required
                                            className="mb-4 w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </>
                                )}

                                <button
                                    disabled={iniciandoSesion}
                                    className="w-full rounded-lg bg-blue-900 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                                >
                                    {recuperacionPaso === "email"
                                        ? "Simular envío de código"
                                        : "Cambiar contraseña"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        cambiarVistaCuenta("login")
                                    }
                                    className="mt-4 block w-full text-center text-sm font-bold text-blue-800 hover:underline"
                                >
                                    Volver al inicio de sesión
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Carrito;
