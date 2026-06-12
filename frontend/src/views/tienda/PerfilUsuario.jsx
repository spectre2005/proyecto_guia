import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clienteAxios from "../../config/axios";
import useProductos from "../../hooks/useProducto";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";

const formularioVacio = {
    nombre: "",
    apellido: "",
    email: "",
    dni: "",
    telefono: "",
    direccion: "",
    username: "",
};

const passwordVacio = {
    password_actual: "",
    password: "",
    password_confirmation: "",
};

const contarProductosDistintos = (detalles = []) =>
    new Set(
        detalles
            .map((detalle) => detalle.stock?.producto?.id)
            .filter(Boolean)
    ).size;

const Icono = ({ tipo }) => {
    const trazos = {
        persona: (
            <>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
            </>
        ),
        usuario: (
            <>
                <circle cx="12" cy="8" r="3" />
                <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
                <rect x="3" y="3" width="18" height="18" rx="2" />
            </>
        ),
        correo: (
            <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
            </>
        ),
        telefono: (
            <path d="M6.6 3h3l1.5 5-2.2 1.4a15 15 0 0 0 5.7 5.7l1.4-2.2 5 1.5v3a3 3 0 0 1-3 3A15 15 0 0 1 3.6 6a3 3 0 0 1 3-3Z" />
        ),
        documento: (
            <>
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M9 8h6M9 12h6M9 16h4" />
            </>
        ),
        direccion: (
            <>
                <path d="m3 11 9-8 9 8" />
                <path d="M5 10v11h14V10M9 21v-7h6v7" />
            </>
        ),
        rol: (
            <>
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
            </>
        ),
        password: (
            <>
                <rect x="5" y="10" width="14" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </>
        ),
    };

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7"
            aria-hidden="true"
        >
            {trazos[tipo]}
        </svg>
    );
};

const PerfilUsuario = () => {
    const navigate = useNavigate();
    const { productos } = useProductos();
    const [form, setForm] = useState(formularioVacio);
    const [borrador, setBorrador] = useState(formularioVacio);
    const [rol, setRol] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [passwordForm, setPasswordForm] = useState(passwordVacio);
    const [mensaje, setMensaje] = useState("");
    const [mensajeTipo, setMensajeTipo] = useState("error");
    const [modal, setModal] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [mostrarResultados, setMostrarResultados] = useState(false);
    const [cantidadCarrito, setCantidadCarrito] = useState(0);
    const [usuarioLogueado, setUsuarioLogueado] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/mi-cuenta")
            .then(({ data }) => {
                if (!activo) return;

                const usuario = data.usuario;
                const persona = usuario.persona || {};
                const datos = {
                    nombre: persona.nombre || "",
                    apellido: persona.apellido || "",
                    email: persona.email || "",
                    dni: persona.dni || "",
                    telefono: persona.telefono || "",
                    direccion: persona.direccion || "",
                    username: usuario.username || "",
                };

                setForm(datos);
                setBorrador(datos);
                setRol(usuario.role?.nombre || "Cliente");
                setUsuarioLogueado(usuario);
                localStorage.setItem("usuario", JSON.stringify(usuario));
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
                        "No se pudo cargar tu perfil."
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

    const resultados = useMemo(() => {
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

    const abrirModal = (seccion) => {
        setBorrador(form);
        setPasswordForm(passwordVacio);
        setMensaje("");
        setModal(seccion);
    };

    const actualizarCampo = (e) => {
        setBorrador({
            ...borrador,
            [e.target.name]: e.target.value,
        });
    };

    const guardarPerfil = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje("");

        try {
            const { data } = await clienteAxios.put("/mi-cuenta", borrador);
            const usuario = data.usuario;
            const persona = usuario.persona || {};
            const datosActualizados = {
                nombre: persona.nombre || "",
                apellido: persona.apellido || "",
                email: persona.email || "",
                dni: persona.dni || "",
                telefono: persona.telefono || "",
                direccion: persona.direccion || "",
                username: usuario.username || "",
            };

            setForm(datosActualizados);
            setBorrador(datosActualizados);
            setUsuarioLogueado(usuario);
            localStorage.setItem("usuario", JSON.stringify(usuario));
            setMensajeTipo("success");
            setMensaje(data.message);
            setModal(null);
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeTipo("error");
            setMensaje(
                primerError ||
                    error.response?.data?.message ||
                    "No se pudo actualizar el perfil."
            );
        } finally {
            setGuardando(false);
        }
    };

    const guardarPassword = async (e) => {
        e.preventDefault();
        setGuardando(true);
        setMensaje("");

        try {
            const { data } = await clienteAxios.put(
                "/mi-cuenta/password",
                passwordForm
            );

            setPasswordForm(passwordVacio);
            setMensajeTipo("success");
            setMensaje(data.message);
            setModal(null);
        } catch (error) {
            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeTipo("error");
            setMensaje(
                primerError ||
                    error.response?.data?.message ||
                    "No se pudo cambiar la contraseña."
            );
        } finally {
            setGuardando(false);
        }
    };

    const buscar = (e) => {
        e.preventDefault();

        if (busqueda.trim()) {
            navigate(`/?buscar=${encodeURIComponent(busqueda.trim())}`);
        }
    };

    const seleccionarProducto = (producto) => {
        navigate(`/?buscar=${encodeURIComponent(producto.nombre)}`);
    };

    const cerrarSesion = async () => {
        try {
            await clienteAxios.post("/logout");
        } catch {
            // La cuenta se cierra localmente aunque el token ya no sea valido.
        }

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        navigate("/");
    };

    const tarjetas = [
        {
            tipo: "persona",
            titulo: "Nombre",
            valor:
                `${form.nombre} ${form.apellido}`.trim() || "Sin registrar",
            modal: "nombre",
        },
        {
            tipo: "usuario",
            titulo: "Nombre de usuario",
            valor: form.username || "Sin registrar",
            modal: "usuario",
        },
        {
            tipo: "correo",
            titulo: "Correo electrónico",
            valor: form.email || "Sin registrar",
            modal: "correo",
        },
        {
            tipo: "telefono",
            titulo: "Teléfono",
            valor: form.telefono || "Sin registrar",
            modal: "telefono",
        },
        {
            tipo: "documento",
            titulo: "Documento de identidad",
            valor: form.dni ? `DNI ${form.dni}` : "Sin registrar",
            modal: "documento",
        },
        {
            tipo: "direccion",
            titulo: "Dirección de casa",
            valor: form.direccion || "Sin registrar",
            modal: "direccion",
        },
        {
            tipo: "password",
            titulo: "Contraseña",
            valor: "Cambiar contraseña de acceso",
            modal: "password",
        },
        {
            tipo: "rol",
            titulo: "Tipo de cuenta",
            valor: rol || "Cliente",
        },
    ];

    const tituloModal = {
        nombre: "Cambiar nombre",
        usuario: "Cambiar nombre de usuario",
        correo: "Cambiar correo electrónico",
        telefono: "Cambiar teléfono",
        documento: "Cambiar documento",
        direccion: "Cambiar dirección",
        password: "Cambiar contraseña",
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
                        onSubmit={buscar}
                        className="relative flex flex-1 rounded-xl border-2 border-yellow-400 bg-white p-1 shadow-lg"
                    >
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setMostrarResultados(true);
                            }}
                            onFocus={() => setMostrarResultados(true)}
                            placeholder="Buscar jeans, polos, casacas..."
                            className="w-full rounded-l-lg px-5 py-3 text-base text-gray-800 outline-none"
                        />
                        <button className="rounded-lg bg-yellow-400 px-6 text-xl font-bold text-blue-950 hover:bg-yellow-500">
                            Buscar
                        </button>

                        {mostrarResultados && busqueda.trim() && (
                            <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border bg-white text-slate-800 shadow-2xl">
                                {resultados.length ? (
                                    resultados.map((producto) => (
                                        <button
                                            key={producto.id}
                                            type="button"
                                            onMouseDown={() =>
                                                seleccionarProducto(producto)
                                            }
                                            className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-blue-50"
                                        >
                                            <span className="font-semibold">
                                                {producto.nombre}
                                            </span>
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
                                {usuarioLogueado?.username} ▾
                            </span>
                        </button>

                        <div className="absolute right-0 top-full z-40 hidden w-64 pt-2 group-hover:block group-focus-within:block">
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-left text-slate-700 shadow-2xl">
                                <div className="border-b px-4 py-3">
                                    <p className="font-bold text-blue-950">
                                        {form.nombre} {form.apellido}
                                    </p>
                                    <p className="truncate text-xs text-slate-500">
                                        {form.email}
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

            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <div className="mb-6">
                    <h2 className="text-3xl font-bold text-blue-950">
                        Perfil
                    </h2>
                    <p className="text-slate-600">
                        Presiona una sección para modificar su información.
                    </p>
                </div>

                {mensaje && !modal && (
                    <div
                        className={`mb-5 rounded-lg px-4 py-3 text-sm ${
                            mensajeTipo === "success"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                        }`}
                    >
                        {mensaje}
                    </div>
                )}

                {cargando ? (
                    <div className="rounded-xl bg-white py-16 text-center text-slate-500 shadow">
                        Cargando perfil...
                    </div>
                ) : (
                    <section className="space-y-1.5">
                        <div className="flex items-center gap-5 rounded-xl bg-slate-800 px-6 py-5 text-white shadow">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-900 text-xl font-bold ring-2 ring-yellow-400">
                                {(form.nombre[0] || form.username[0] || "U")
                                    .toUpperCase()}
                                {(form.apellido[0] || "").toUpperCase()}
                            </div>
                            <div className="flex-1">
                                <p className="text-lg font-bold">
                                    Imagen de perfil
                                </p>
                                <p className="text-sm text-slate-300">
                                    Avatar generado con tus iniciales
                                </p>
                            </div>
                        </div>

                        {tarjetas.map((tarjeta) => {
                            const contenido = (
                                <>
                                    <span className="text-slate-200">
                                        <Icono tipo={tarjeta.tipo} />
                                    </span>
                                    <span className="flex-1">
                                        <span className="block text-lg font-bold text-white">
                                            {tarjeta.titulo}
                                        </span>
                                        <span className="block text-base text-slate-300">
                                            {tarjeta.valor}
                                        </span>
                                    </span>
                                    {tarjeta.modal && (
                                        <span className="text-2xl text-slate-400">
                                            ›
                                        </span>
                                    )}
                                </>
                            );

                            return tarjeta.modal ? (
                                <button
                                    key={tarjeta.titulo}
                                    type="button"
                                    onClick={() =>
                                        abrirModal(tarjeta.modal)
                                    }
                                    className="flex w-full items-center gap-5 rounded-xl bg-slate-700 px-6 py-5 text-left shadow transition hover:bg-slate-600"
                                >
                                    {contenido}
                                </button>
                            ) : (
                                <div
                                    key={tarjeta.titulo}
                                    className="flex items-center gap-5 rounded-xl bg-slate-700 px-6 py-5 text-left shadow"
                                >
                                    {contenido}
                                </div>
                            );
                        })}
                    </section>
                )}
            </main>

            {modal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 px-4">
                    <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            type="button"
                            onClick={() => setModal(null)}
                            className="absolute right-4 top-3 text-2xl font-bold text-slate-400 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h3 className="mb-1 text-2xl font-bold text-blue-950">
                            {tituloModal[modal]}
                        </h3>
                        <p className="mb-5 text-sm text-slate-500">
                            Actualiza los datos y guarda los cambios.
                        </p>

                        {mensaje && (
                            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700">
                                {mensaje}
                            </div>
                        )}

                        <form
                            onSubmit={
                                modal === "password"
                                    ? guardarPassword
                                    : guardarPerfil
                            }
                            className="space-y-4"
                        >
                            {modal === "nombre" && (
                                <>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Nombre
                                        <input
                                            name="nombre"
                                            value={borrador.nombre}
                                            onChange={actualizarCampo}
                                            required
                                            className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Apellido
                                        <input
                                            name="apellido"
                                            value={borrador.apellido}
                                            onChange={actualizarCampo}
                                            required
                                            className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </label>
                                </>
                            )}

                            {modal === "usuario" && (
                                <label className="block text-sm font-semibold text-slate-700">
                                    Nombre de usuario
                                    <input
                                        name="username"
                                        value={borrador.username}
                                        onChange={actualizarCampo}
                                        minLength={4}
                                        required
                                        className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                </label>
                            )}

                            {modal === "correo" && (
                                <label className="block text-sm font-semibold text-slate-700">
                                    Correo electrónico
                                    <input
                                        type="email"
                                        name="email"
                                        value={borrador.email}
                                        onChange={actualizarCampo}
                                        required
                                        className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                </label>
                            )}

                            {modal === "telefono" && (
                                <label className="block text-sm font-semibold text-slate-700">
                                    Teléfono
                                    <input
                                        name="telefono"
                                        value={borrador.telefono}
                                        onChange={actualizarCampo}
                                        inputMode="tel"
                                        className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                </label>
                            )}

                            {modal === "documento" && (
                                <label className="block text-sm font-semibold text-slate-700">
                                    DNI
                                    <input
                                        name="dni"
                                        value={borrador.dni}
                                        onChange={actualizarCampo}
                                        inputMode="numeric"
                                        maxLength={8}
                                        pattern="[0-9]{8}"
                                        className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                </label>
                            )}

                            {modal === "direccion" && (
                                <label className="block text-sm font-semibold text-slate-700">
                                    Dirección
                                    <textarea
                                        name="direccion"
                                        value={borrador.direccion}
                                        onChange={actualizarCampo}
                                        rows={3}
                                        className="mt-2 w-full resize-none rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                    />
                                </label>
                            )}

                            {modal === "password" && (
                                <>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Contraseña actual
                                        <input
                                            type="password"
                                            value={
                                                passwordForm.password_actual
                                            }
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    password_actual:
                                                        e.target.value,
                                                })
                                            }
                                            autoComplete="current-password"
                                            required
                                            className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Nueva contraseña
                                        <input
                                            type="password"
                                            value={passwordForm.password}
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    password: e.target.value,
                                                })
                                            }
                                            autoComplete="new-password"
                                            minLength={6}
                                            required
                                            className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </label>
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Confirmar nueva contraseña
                                        <input
                                            type="password"
                                            value={
                                                passwordForm.password_confirmation
                                            }
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    password_confirmation:
                                                        e.target.value,
                                                })
                                            }
                                            autoComplete="new-password"
                                            minLength={6}
                                            required
                                            className="mt-2 w-full rounded-lg border px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </label>
                                </>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModal(null)}
                                    className="rounded-lg border px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={guardando}
                                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : "Guardar cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PerfilUsuario;
