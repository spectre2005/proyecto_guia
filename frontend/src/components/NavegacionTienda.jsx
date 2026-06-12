import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import clienteAxios from "../config/axios";

const NavegacionTienda = () => {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [categorias, setCategorias] = useState([]);
    const usuario = JSON.parse(localStorage.getItem("usuario")) || null;
    const autenticado = Boolean(usuario && localStorage.getItem("token"));

    useEffect(() => {
        let activo = true;

        clienteAxios
            .get("/categorias")
            .then(({ data }) => {
                if (!activo) return;
                setCategorias(
                    Array.isArray(data) ? data : data.data || []
                );
            })
            .catch(() => {
                if (activo) setCategorias([]);
            });

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        document.body.style.overflow = abierto ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [abierto]);

    const irA = (ruta) => {
        setAbierto(false);
        navigate(ruta);
    };

    const cerrarSesion = async () => {
        try {
            await clienteAxios.post("/logout");
        } catch {
            // La sesión local se limpia incluso si el token ya venció.
        }

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setAbierto(false);
        navigate("/");
    };

    return (
        <>
            <nav className="flex items-center gap-6 overflow-x-auto bg-blue-900 px-6 py-3 text-sm font-semibold text-white">
                <button
                    type="button"
                    onClick={() => setAbierto(true)}
                    className="flex shrink-0 items-center gap-2 rounded px-1 py-1 hover:text-yellow-300"
                >
                    <span className="text-xl leading-none">☰</span>
                    <span>Todo</span>
                </button>

                <Link
                    to="/?buscar=ofertas"
                    className="shrink-0 hover:text-yellow-300"
                >
                    Ofertas
                </Link>

                {categorias.slice(0, 4).map((categoria) => (
                    <Link
                        key={categoria.id}
                        to={`/?categoria=${categoria.id}`}
                        className="shrink-0 hover:text-yellow-300"
                    >
                        {categoria.nombre}
                    </Link>
                ))}

                <Link
                    to={autenticado ? "/pedidos" : "/?login=1"}
                    className="shrink-0 hover:text-yellow-300"
                >
                    Mis pedidos
                </Link>
                <a
                    href="mailto:soporte@novedadesfernando.test"
                    className="shrink-0 hover:text-yellow-300"
                >
                    Servicio al Cliente
                </a>
            </nav>

            {abierto && (
                <div className="fixed inset-0 z-[100] flex">
                    <button
                        type="button"
                        aria-label="Cerrar menú"
                        onClick={() => setAbierto(false)}
                        className="absolute inset-0 bg-black/65"
                    />

                    <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-white text-slate-800 shadow-2xl">
                        <div className="flex items-center justify-between bg-slate-800 px-6 py-5 text-white">
                            <div>
                                <p className="text-sm text-slate-300">
                                    {autenticado ? "Bienvenido" : "Hola"}
                                </p>
                                <p className="text-xl font-bold">
                                    {autenticado
                                        ? usuario.persona?.nombre ||
                                          usuario.username
                                        : "Menú de la tienda"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAbierto(false)}
                                className="rounded-lg border border-white/60 px-3 py-1 text-2xl hover:bg-white/10"
                            >
                                ×
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <h2 className="text-2xl font-black text-slate-900">
                                Categorías
                            </h2>
                            <div className="mt-4 divide-y">
                                <button
                                    type="button"
                                    onClick={() => irA("/")}
                                    className="flex w-full items-center justify-between py-4 text-left font-semibold hover:text-blue-700"
                                >
                                    Todos los productos
                                    <span>›</span>
                                </button>
                                {categorias.map((categoria) => (
                                    <button
                                        key={categoria.id}
                                        type="button"
                                        onClick={() =>
                                            irA(
                                                `/?categoria=${categoria.id}`
                                            )
                                        }
                                        className="flex w-full items-center justify-between py-4 text-left hover:text-blue-700"
                                    >
                                        <span>
                                            {categoria.nombre}
                                            <small className="ml-2 text-slate-400">
                                                (
                                                {categoria.productos_count ??
                                                    0}
                                                )
                                            </small>
                                        </span>
                                        <span>›</span>
                                    </button>
                                ))}
                            </div>

                            <h2 className="mt-8 border-t pt-7 text-2xl font-black text-slate-900">
                                Compras y funcionalidades
                            </h2>
                            <div className="mt-3 space-y-1">
                                <button
                                    type="button"
                                    onClick={() => irA("/?buscar=ofertas")}
                                    className="block w-full rounded-lg px-3 py-3 text-left hover:bg-blue-50"
                                >
                                    Ofertas de la tienda
                                </button>
                                <button
                                    type="button"
                                    onClick={() => irA("/carrito")}
                                    className="block w-full rounded-lg px-3 py-3 text-left hover:bg-blue-50"
                                >
                                    Mi carrito
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        irA(
                                            autenticado
                                                ? "/pedidos"
                                                : "/?login=1"
                                        )
                                    }
                                    className="block w-full rounded-lg px-3 py-3 text-left hover:bg-blue-50"
                                >
                                    Mis pedidos
                                </button>
                                {!autenticado && (
                                    <button
                                        type="button"
                                        onClick={() => irA("/?login=1")}
                                        className="block w-full rounded-lg px-3 py-3 text-left font-bold text-blue-700 hover:bg-blue-50"
                                    >
                                        Iniciar sesión
                                    </button>
                                )}
                            </div>

                            <h2 className="mt-8 border-t pt-7 text-2xl font-black text-slate-900">
                                Ayuda y configuración
                            </h2>
                            <div className="mt-3 space-y-1">
                                <button
                                    type="button"
                                    onClick={() =>
                                        irA(
                                            autenticado
                                                ? "/perfil"
                                                : "/?login=1"
                                        )
                                    }
                                    className="block w-full rounded-lg px-3 py-3 text-left hover:bg-blue-50"
                                >
                                    Cuenta y perfil
                                </button>
                                <p className="rounded-lg px-3 py-3">
                                    Idioma: Español
                                </p>
                                <p className="rounded-lg px-3 py-3">
                                    Ubicación: Perú
                                </p>
                                <a
                                    href="mailto:soporte@novedadesfernando.test"
                                    className="block rounded-lg px-3 py-3 hover:bg-blue-50"
                                >
                                    Contactar a Servicio al Cliente
                                </a>
                                {autenticado && (
                                    <button
                                        type="button"
                                        onClick={cerrarSesion}
                                        className="block w-full rounded-lg px-3 py-3 text-left font-bold text-red-600 hover:bg-red-50"
                                    >
                                        Cerrar sesión
                                    </button>
                                )}
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </>
    );
};

export default NavegacionTienda;
