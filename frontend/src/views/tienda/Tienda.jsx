import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useProductos from "../../hooks/useProducto";
import clienteAxios from "../../config/axios";
import logoTienda from "../../assets/logo-tienda.jfif";
import NavegacionTienda from "../../components/NavegacionTienda";
import {
    agregarAlCarritoInvitado,
    contarCarritoInvitado,
    fusionarCarritoInvitado,
} from "../../utils/carritoInvitado";

const Productos = () => {
    const navigate = useNavigate();
    const { productos, loading, obtenerProductos } = useProductos();
    const [searchParams, setSearchParams] = useSearchParams();
    const [busqueda, setBusqueda] = useState(
        searchParams.get("buscar") || ""
    );
    const categoriaSeleccionada = searchParams.get("categoria") || "";
    const [materiales, setMateriales] = useState([]);
    const [tallas, setTallas] = useState([]);
    const [generosSeleccionados, setGenerosSeleccionados] = useState([]);
    const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);
    const [preciosSeleccionados, setPreciosSeleccionados] = useState([]);
    const [tallasSeleccionadas, setTallasSeleccionadas] = useState([]);

    const [modal, setModal] = useState(
        searchParams.get("login") === "1"
            ? "login"
            : searchParams.get("registro") === "1"
              ? "registro"
              : null
    );
    const [mensaje, setMensaje] = useState("");
    const [mensajeTipo, setMensajeTipo] = useState("error");
    const [notificacion, setNotificacion] = useState("");
    const [cantidadCarrito, setCantidadCarrito] = useState(() =>
        localStorage.getItem("token") ? 0 : contarCarritoInvitado()
    );
    const [agregando, setAgregando] = useState(null);
    const [usuarioLogueado, setUsuarioLogueado] = useState(
        JSON.parse(localStorage.getItem("usuario")) || null
    );

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

    const contarProductosDistintos = (detalles) =>
        new Set(
            detalles
                .map((detalle) => detalle.stock?.producto?.id)
                .filter(Boolean)
        ).size;

    useEffect(() => {
        obtenerProductos();
    }, [obtenerProductos]);

    useEffect(() => {
        let activo = true;

        queueMicrotask(() => {
            if (!activo) return;

            setBusqueda(searchParams.get("buscar") || "");

            if (searchParams.get("login") === "1") {
                setModal("login");
                setMensaje("");
            } else if (searchParams.get("registro") === "1") {
                setModal("registro");
                setMensaje("");
            }
        });

        return () => {
            activo = false;
        };
    }, [searchParams]);

    useEffect(() => {
        if (!localStorage.getItem("token")) return;

        let activo = true;

        clienteAxios
            .get("/mi-carrito")
            .then(({ data }) => {
                if (!activo) return;

                setCantidadCarrito(
                    contarProductosDistintos(data.data?.detalles || [])
                );
            })
            .catch(() => {
                // El carrito se volverá a consultar cuando el usuario lo abra.
            });

        return () => {
            activo = false;
        };
    }, []);

    useEffect(() => {
        let activo = true;

        Promise.all([
            clienteAxios.get("/materiales"),
            clienteAxios.get("/tallas"),
        ])
            .then(([materialesResponse, tallasResponse]) => {
                if (!activo) return;

                const materialesData = materialesResponse.data;
                const tallasData = tallasResponse.data;

                setMateriales(
                    Array.isArray(materialesData)
                        ? materialesData
                        : materialesData.data || []
                );
                setTallas(
                    Array.isArray(tallasData)
                        ? tallasData
                        : tallasData.data || []
                );
            })
            .catch(() => {
                if (!activo) return;
                setMateriales([]);
                setTallas([]);
            });

        return () => {
            activo = false;
        };
    }, []);

    const obtenerPrecio = (producto) => {
        const stockDisponible = Array.isArray(producto.stocks)
            ? producto.stocks.find((stock) => Number(stock.cantidad) > 0)
            : null;

        return (
            stockDisponible?.precio ??
            producto.precio ??
            producto.precio_venta ??
            producto.stock?.precio ??
            producto.stocks?.[0]?.precio ??
            producto.stock_producto?.precio ??
            0
        );
    };

    const obtenerStock = (producto) => {
        if (Array.isArray(producto.stocks)) {
            return producto.stocks.reduce(
                (total, stock) => total + Number(stock.cantidad || 0),
                0
            );
        }

        return Number(
            producto.stock?.cantidad ??
                producto.stock_producto?.cantidad ??
                producto.cantidad ??
                producto.stock ??
                0
        );
    };

    const obtenerStockDisponible = (producto) => {
        if (Array.isArray(producto.stocks)) {
            return producto.stocks.find(
                (stock) => Number(stock.cantidad) > 0
            );
        }

        return producto.stock || producto.stock_producto || null;
    };

    const normalizarTexto = (valor) =>
        String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();

    const productosFiltrados = Array.isArray(productos)
        ? productos.filter((producto) => {
              const terminosBusqueda = normalizarTexto(busqueda)
                  .split(/\s+/)
                  .filter(Boolean);
              const camposBusqueda = [
                  producto.nombre,
                  producto.descripcion,
                  producto.categoria?.nombre,
                  producto.marca?.nombre,
                  producto.marca?.descripcion,
                  producto.material?.nombre,
                  producto.genero,
              ].map(normalizarTexto);
              const stocksDisponibles = Array.isArray(producto.stocks)
                  ? producto.stocks.filter(
                        (stock) => Number(stock.cantidad) > 0
                    )
                  : [];
              const coincideTexto =
                  terminosBusqueda.length === 0 ||
                  terminosBusqueda.every((termino) =>
                      camposBusqueda.some((campo) => campo.includes(termino))
                  );
              const coincideCategoria =
                  !categoriaSeleccionada ||
                  String(producto.categorias_id) === categoriaSeleccionada ||
                  String(producto.categoria?.id) === categoriaSeleccionada;
              const coincideGenero =
                  generosSeleccionados.length === 0 ||
                  generosSeleccionados.includes(producto.genero);
              const coincideMaterial =
                  materialesSeleccionados.length === 0 ||
                  materialesSeleccionados.includes(
                      String(producto.materiales_id)
                  );
              const coincideVariante =
                  (preciosSeleccionados.length === 0 &&
                      tallasSeleccionadas.length === 0) ||
                  stocksDisponibles.some((stock) => {
                      const precio = Number(stock.precio || 0);
                      const coincidePrecio =
                          preciosSeleccionados.length === 0 ||
                          preciosSeleccionados.some((rango) => {
                              if (rango === "menos-50") return precio < 50;
                              if (rango === "50-100") {
                                  return precio >= 50 && precio <= 100;
                              }
                              return rango === "mas-100" && precio > 100;
                          });
                      const coincideTalla =
                          tallasSeleccionadas.length === 0 ||
                          tallasSeleccionadas.includes(
                              String(stock.tallas_id)
                          );

                      return coincidePrecio && coincideTalla;
                  });

              return (
                  coincideTexto &&
                  coincideCategoria &&
                  coincideGenero &&
                  coincideMaterial &&
                  coincideVariante
              );
          })
        : [];

    const alternarFiltro = (valor, seleccionados, actualizar) => {
        actualizar(
            seleccionados.includes(valor)
                ? seleccionados.filter((item) => item !== valor)
                : [...seleccionados, valor]
        );
    };

    const limpiarFiltros = () => {
        setGenerosSeleccionados([]);
        setMaterialesSeleccionados([]);
        setPreciosSeleccionados([]);
        setTallasSeleccionadas([]);
    };

    const buscarProductos = (e) => {
        e.preventDefault();
        const texto = busqueda.trim();

        if (texto) {
            setSearchParams({ buscar: texto });
        } else {
            setSearchParams({});
        }
    };

    const cerrarModal = () => {
        setModal(null);

        if (searchParams.has("login") || searchParams.has("registro")) {
            const nuevosParametros = new URLSearchParams(searchParams);
            nuevosParametros.delete("login");
            nuevosParametros.delete("registro");
            setSearchParams(nuevosParametros, { replace: true });
        }
    };

    const agregarAlCarrito = async (producto) => {
        const stock = obtenerStockDisponible(producto);

        if (!stock) {
            setNotificacion("Este producto no tiene stock disponible.");
            return;
        }

        setAgregando(producto.id);
        setNotificacion("");

        try {
            if (!usuarioLogueado || !localStorage.getItem("token")) {
                agregarAlCarritoInvitado(producto, stock);
                setCantidadCarrito(contarCarritoInvitado());
                setNotificacion(
                    `${producto.nombre} fue agregado al carrito.`
                );
                return;
            }

            const { data } = await clienteAxios.post("/mi-carrito/items", {
                stocks_id: stock.id,
                cantidad: 1,
            });
            setCantidadCarrito(
                contarProductosDistintos(data.data?.detalles || [])
            );
            setNotificacion(`${producto.nombre} fue agregado al carrito.`);
        } catch (error) {
            setNotificacion(
                error.response?.data?.message ||
                    "No se pudo agregar el producto al carrito."
            );
        } finally {
            setAgregando(null);
        }
    };

    const iniciarSesion = async (e) => {
        e.preventDefault();
        setMensaje("");

        try {
            const { data } = await clienteAxios.post("/login", loginForm);

            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));

            const rol = data.usuario?.role?.nombre;

            if (rol === "Cliente") {
                await fusionarCarritoInvitado(clienteAxios);
                const destino =
                    localStorage.getItem("redirect_despues_login") || "/";
                localStorage.removeItem("redirect_despues_login");
                window.location.href = destino;
            } else if (rol === "Vendedor" || rol === "Administrador") {
                window.location.href = "/panel";
            }

            setUsuarioLogueado(data.usuario);
            setCantidadCarrito(0);
            setModal(null);
            setLoginForm({
                username: "",
                password: "",
            });
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message || "Error al iniciar sesión"
            );
        }
    };

    const registrarUsuario = async (e) => {
        e.preventDefault();
        setMensaje("");

        try {
            const { data } = await clienteAxios.post("/register", registroForm);

            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));

            await fusionarCarritoInvitado(clienteAxios);
            const respuestaCarrito = await clienteAxios.get("/mi-carrito");
            const cantidad = contarProductosDistintos(
                respuestaCarrito.data.data?.detalles || []
            );

            setUsuarioLogueado(data.usuario);
            setCantidadCarrito(cantidad);
            setModal(null);
            setRegistroForm({
                nombre: "",
                apellido: "",
                email: "",
                username: "",
                password: "",
            });

            const destino =
                localStorage.getItem("redirect_despues_login");
            if (destino) {
                localStorage.removeItem("redirect_despues_login");
                window.location.href = destino;
            }
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message || "Error al registrar usuario"
            );
        }
    };

    const solicitarRecuperacion = async (e) => {
        e.preventDefault();
        setMensaje("");

        try {
            const { data } = await clienteAxios.post(
                "/recuperar-password",
                { email: recuperacionForm.email }
            );

            setRecuperacionPaso("codigo");
            setMensajeTipo("info");
            setMensaje(
                `Simulacion de correo: tu codigo es ${data.codigo_simulado}. Vence en ${data.expira_en_minutos} minutos.`
            );
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message ||
                    "No se pudo simular el envio del correo"
            );
        }
    };

    const restablecerPassword = async (e) => {
        e.preventDefault();
        setMensaje("");

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
            setModal("login");
            setMensajeTipo("success");
            setMensaje(data.message);
            localStorage.removeItem("token");
            localStorage.removeItem("usuario");
            setUsuarioLogueado(null);
        } catch (error) {
            setMensajeTipo("error");
            setMensaje(
                error.response?.data?.message ||
                    "No se pudo cambiar la contrasena"
            );
        }
    };

    const cerrarSesion = async () => {
        try {
            await clienteAxios.post("/logout");
        } catch {
            // La sesion local se elimina incluso si el token ya vencio.
        }

        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        setUsuarioLogueado(null);
        setCantidadCarrito(contarCarritoInvitado());
        setModal(null);
    };

    const cambiarCuenta = async () => {
        await cerrarSesion();
        setLoginForm({
            username: "",
            password: "",
        });
        setMensaje("");
        setModal("login");
    };

    if (loading) return <p className="p-6">Cargando productos...</p>;

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="bg-blue-950 text-white">
                <div className="flex items-center gap-4 px-6 py-4">
                    <img
                        src={logoTienda}
                        alt="Novedades Fernando"
                        className="w-16 h-16 rounded-full bg-white p-1 object-contain"
                    />

                    <div className="min-w-220px">
                        <h1 className="text-2xl font-bold">
                            Novedades Fernando
                        </h1>
                        <p className="text-sm text-blue-200">
                            El Palacio del Jeans
                        </p>
                    </div>

                    <form
                        onSubmit={buscarProductos}
                        className="flex flex-1 rounded-xl border-2 border-yellow-400 bg-white p-1 shadow-lg"
                    >
                        <input
                            type="search"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar jeans, polos, casacas..."
                            className="w-full px-5 py-3 rounded-l-lg text-gray-800 outline-none text-base"
                        />

                        <button
                            type="submit"
                            className="bg-yellow-400 hover:bg-yellow-500 text-blue-950 px-6 rounded-lg font-bold text-xl"
                        >
                            Buscar
                        </button>
                    </form>

                    {!usuarioLogueado ? (
                        <>
                            <button
                                onClick={() => {
                                    setModal("login");
                                    setMensaje("");
                                }}
                                className="hover:text-yellow-300 font-semibold"
                            >
                                Iniciar sesión
                            </button>

                            <button
                                onClick={() => {
                                    setModal("registro");
                                    setMensaje("");
                                }}
                                className="bg-white text-blue-950 hover:bg-blue-100 px-4 py-2 rounded-lg font-bold"
                            >
                                Registrarse
                            </button>
                        </>
                    ) : (
                        <div className="relative group py-2">
                            <button
                                type="button"
                                className="text-right rounded-lg px-3 py-1 hover:bg-blue-900 focus:bg-blue-900 outline-none"
                            >
                                <span className="block text-sm text-blue-200">
                                    Bienvenido
                                </span>
                                <span className="block font-bold">
                                    {usuarioLogueado.username} ▾
                                </span>
                            </button>

                            <div className="absolute right-0 top-full z-40 hidden w-64 pt-2 group-hover:block group-focus-within:block">
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white py-2 text-left text-slate-700 shadow-2xl">
                                    <div className="border-b px-4 py-3">
                                        <p className="font-bold text-blue-950">
                                            {usuarioLogueado.persona?.nombre ||
                                                usuarioLogueado.username}{" "}
                                            {usuarioLogueado.persona?.apellido ||
                                                ""}
                                        </p>
                                        <p className="truncate text-xs text-slate-500">
                                            {usuarioLogueado.persona?.email ||
                                                "Cuenta de usuario"}
                                        </p>
                                    </div>

                                    <Link
                                        to="/perfil"
                                        className="block w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-900"
                                    >
                                        Mi cuenta
                                    </Link>
                                    <Link
                                        to="/pedidos"
                                        className="block w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-900"
                                    >
                                        Mis pedidos
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={cambiarCuenta}
                                        className="block w-full px-4 py-3 text-left hover:bg-blue-50 hover:text-blue-900"
                                    >
                                        Cambiar cuenta
                                    </button>
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
                        className="relative rounded-lg bg-yellow-400 px-5 py-3 font-bold text-blue-950 hover:bg-yellow-500"
                    >
                        Carrito
                        {cantidadCarrito > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
                                {cantidadCarrito}
                            </span>
                        )}
                    </Link>
                </div>

                <NavegacionTienda />
            </header>

            <div className="flex">
                <aside className="hidden md:block w-64 bg-white min-h-screen p-5 border-r">
                    <h2 className="text-xl font-bold text-blue-950 mb-6">
                        Filtros
                    </h2>

                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="mb-5 text-sm font-semibold text-blue-800 hover:underline"
                    >
                        Limpiar filtros
                    </button>

                    <h3 className="font-bold mb-3">Género</h3>

                    {["Hombre", "Mujer", "Unisex"].map((genero) => (
                        <label key={genero} className="block mb-2">
                            <input
                                type="checkbox"
                                checked={generosSeleccionados.includes(genero)}
                                onChange={() =>
                                    alternarFiltro(
                                        genero,
                                        generosSeleccionados,
                                        setGenerosSeleccionados
                                    )
                                }
                                className="mr-2"
                            />
                            {genero}
                        </label>
                    ))}

                    <h3 className="font-bold mb-3 mt-6">Material</h3>

                    <div className="mb-7 max-h-48 overflow-y-auto">
                        {materiales.map((material) => {
                            const id = String(material.id);

                            return (
                                <label
                                    key={material.id}
                                    className="block mb-2"
                                >
                                    <input
                                        type="checkbox"
                                        checked={materialesSeleccionados.includes(
                                            id
                                        )}
                                        onChange={() =>
                                            alternarFiltro(
                                                id,
                                                materialesSeleccionados,
                                                setMaterialesSeleccionados
                                            )
                                        }
                                        className="mr-2"
                                    />
                                    {material.nombre}
                                </label>
                            );
                        })}
                    </div>

                    <h3 className="font-bold mb-3">Precio</h3>

                    <label className="block mb-2">
                        <input
                            type="checkbox"
                            checked={preciosSeleccionados.includes("menos-50")}
                            onChange={() =>
                                alternarFiltro(
                                    "menos-50",
                                    preciosSeleccionados,
                                    setPreciosSeleccionados
                                )
                            }
                            className="mr-2"
                        />
                        Menos de S/ 50
                    </label>

                    <label className="block mb-2">
                        <input
                            type="checkbox"
                            checked={preciosSeleccionados.includes("50-100")}
                            onChange={() =>
                                alternarFiltro(
                                    "50-100",
                                    preciosSeleccionados,
                                    setPreciosSeleccionados
                                )
                            }
                            className="mr-2"
                        />
                        S/ 50 - S/ 100
                    </label>

                    <label className="block mb-7">
                        <input
                            type="checkbox"
                            checked={preciosSeleccionados.includes("mas-100")}
                            onChange={() =>
                                alternarFiltro(
                                    "mas-100",
                                    preciosSeleccionados,
                                    setPreciosSeleccionados
                                )
                            }
                            className="mr-2"
                        />
                        Más de S/ 100
                    </label>

                    <h3 className="font-bold mb-3">Tallas</h3>

                    <div className="flex flex-wrap gap-2">
                        {tallas.map((talla) => {
                            const id = String(talla.id);
                            const seleccionada =
                                tallasSeleccionadas.includes(id);

                            return (
                            <button
                                type="button"
                                key={talla.id}
                                onClick={() =>
                                    alternarFiltro(
                                        id,
                                        tallasSeleccionadas,
                                        setTallasSeleccionadas
                                    )
                                }
                                className={`rounded border px-3 py-1 font-semibold ${
                                    seleccionada
                                        ? "border-blue-900 bg-blue-900 text-white"
                                        : "border-blue-700 text-blue-900 hover:bg-blue-900 hover:text-white"
                                }`}
                            >
                                {talla.nombre}
                            </button>
                            );
                        })}
                    </div>
                </aside>

                <main className="flex-1 p-6">
                    <h2 className="text-3xl font-bold text-blue-950">
                        Resultados
                    </h2>

                    <p className="text-gray-600 mb-6">
                        Productos disponibles de Novedades Fernando.
                    </p>

                    {notificacion && (
                        <div className="mb-5 flex items-center justify-between rounded-lg bg-blue-100 px-4 py-3 text-blue-800">
                            <span>{notificacion}</span>
                            <button
                                type="button"
                                onClick={() => setNotificacion("")}
                                className="font-bold"
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {productosFiltrados.map((producto) => {
                                const precio = obtenerPrecio(producto);
                                const stock = obtenerStock(producto);
                                const stockDisponible =
                                    obtenerStockDisponible(producto);
                                const rutaDetalle = stockDisponible
                                    ? `/productos/${producto.id}?stock=${stockDisponible.id}`
                                    : `/productos/${producto.id}`;

                                return (
                                    <div
                                        key={producto.id}
                                        role="link"
                                        tabIndex={0}
                                        onClick={() =>
                                            navigate(rutaDetalle)
                                        }
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" ||
                                                e.key === " "
                                            ) {
                                                navigate(rutaDetalle);
                                            }
                                        }}
                                        className="cursor-pointer overflow-hidden rounded-xl border bg-white shadow transition hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="h-72 bg-blue-50 flex items-center justify-center">
                                            <img
                                                src={
                                                    producto.imagen
                                                        ? `http://127.0.0.1:8000/storage/${producto.imagen}`
                                                        : "https://via.placeholder.com/300x300?text=Sin+Imagen"
                                                }
                                                alt={producto.nombre}
                                                className="h-full w-full object-contain p-4"
                                            />
                                        </div>

                                        <div className="p-4">
                                            <h3 className="h-14 overflow-hidden text-lg font-bold">
                                                {producto.nombre}
                                            </h3>

                                            <p className="text-sm font-semibold mt-3">
                                                Stock:{" "}
                                                <span
                                                    className={
                                                        Number(stock) > 0
                                                            ? "text-green-700"
                                                            : "text-red-600"
                                                    }
                                                >
                                                    {Number(stock)}
                                                </span>
                                            </p>

                                            <p className="text-3xl font-bold text-blue-950 mt-2">
                                                S/{" "}
                                                {Number(precio || 0).toFixed(2)}
                                            </p>

                                            <p className="mt-2 font-bold text-green-700">
                                                Envío gratis
                                            </p>

                                            <button
                                                disabled={
                                                    Number(stock) <= 0 ||
                                                    agregando === producto.id
                                                }
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    agregarAlCarrito(producto);
                                                }}
                                                className={`w-full py-2 rounded-lg mt-4 font-bold ${
                                                    Number(stock) > 0
                                                        ? "bg-yellow-400 hover:bg-yellow-500 text-blue-950"
                                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                                                }`}
                                            >
                                                {Number(stock) > 0
                                                    ? agregando === producto.id
                                                        ? "Agregando..."
                                                        : "Agregar al carrito"
                                                    : "Sin stock"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    {!productosFiltrados.length && (
                        <div className="mt-6 rounded-xl bg-white p-8 text-center text-slate-500 shadow">
                            {busqueda
                                ? `No se encontraron productos para "${busqueda}".`
                                : "No se encontraron productos en esta categoría."}
                        </div>
                    )}
                </main>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <button
                            onClick={cerrarModal}
                            className="absolute top-3 right-4 text-2xl font-bold text-gray-500 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h2 className="text-2xl font-bold text-blue-950 mb-2 text-center">
                            {modal === "login"
                                ? "Iniciar sesión"
                                : modal === "registro"
                                  ? "Crear cuenta"
                                  : "Recuperar contraseña"}
                        </h2>

                        <p className="text-center text-gray-500 mb-5">
                            {modal === "login"
                                ? "Ingresa con tu usuario y contraseña"
                                : modal === "registro"
                                  ? "Regístrate como nuevo cliente"
                                  : recuperacionPaso === "email"
                                    ? "Simularemos el envío de un código a tu correo"
                                    : "Ingresa el código y tu nueva contraseña"}
                        </p>

                        {mensaje && (
                            <div
                                className={`px-4 py-2 rounded-lg mb-4 text-sm ${
                                    mensajeTipo === "success"
                                        ? "bg-green-100 text-green-700"
                                        : mensajeTipo === "info"
                                          ? "bg-blue-100 text-blue-800"
                                          : "bg-red-100 text-red-700"
                                }`}
                            >
                                {mensaje}
                            </div>
                        )}

                        {modal === "login" ? (
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
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
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
                                    className="w-full border px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <button className="w-full bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-lg font-bold">
                                    Ingresar
                                </button>

                                <p className="text-center mt-4 text-sm">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModal("recuperacion");
                                            setMensaje("");
                                            setMensajeTipo("error");
                                        }}
                                        className="text-blue-800 font-bold hover:underline"
                                    >
                                        Olvidé mi contraseña
                                    </button>
                                </p>

                                <p className="text-center mt-4 text-sm text-gray-600">
                                    ¿No tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModal("registro");
                                            setMensaje("");
                                        }}
                                        className="text-blue-800 font-bold hover:underline"
                                    >
                                        Regístrate
                                    </button>
                                </p>
                            </form>
                        ) : modal === "registro" ? (
                            <form onSubmit={registrarUsuario}>
                                <input
                                    type="text"
                                    placeholder="Nombre"
                                    value={registroForm.nombre}
                                    onChange={(e) =>
                                        setRegistroForm({
                                            ...registroForm,
                                            nombre: e.target.value,
                                        })
                                    }
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <input
                                    type="text"
                                    placeholder="Apellido"
                                    value={registroForm.apellido}
                                    onChange={(e) =>
                                        setRegistroForm({
                                            ...registroForm,
                                            apellido: e.target.value,
                                        })
                                    }
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <input
                                    type="email"
                                    placeholder="Correo electrónico"
                                    value={registroForm.email}
                                    onChange={(e) =>
                                        setRegistroForm({
                                            ...registroForm,
                                            email: e.target.value,
                                        })
                                    }
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <input
                                    type="text"
                                    placeholder="Usuario"
                                    value={registroForm.username}
                                    onChange={(e) =>
                                        setRegistroForm({
                                            ...registroForm,
                                            username: e.target.value,
                                        })
                                    }
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <input
                                    type="password"
                                    placeholder="Contraseña"
                                    value={registroForm.password}
                                    onChange={(e) =>
                                        setRegistroForm({
                                            ...registroForm,
                                            password: e.target.value,
                                        })
                                    }
                                    className="w-full border px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-700"
                                />

                                <button className="w-full bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-lg font-bold">
                                    Crear cuenta
                                </button>

                                <p className="text-center mt-4 text-sm text-gray-600">
                                    ¿Ya tienes cuenta?{" "}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModal("login");
                                            setMensaje("");
                                        }}
                                        className="text-blue-800 font-bold hover:underline"
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
                                    className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700 read-only:bg-gray-100"
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
                                            className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
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
                                            className="w-full border px-4 py-3 rounded-lg mb-3 outline-none focus:ring-2 focus:ring-blue-700"
                                        />

                                        <input
                                            type="password"
                                            placeholder="Confirmar nueva contraseña"
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
                                            className="w-full border px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-blue-700"
                                        />
                                    </>
                                )}

                                <button className="w-full bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-lg font-bold">
                                    {recuperacionPaso === "email"
                                        ? "Simular envío de código"
                                        : "Cambiar contraseña"}
                                </button>

                                <p className="text-center mt-4 text-sm text-gray-600">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModal("login");
                                            setMensaje("");
                                            setRecuperacionPaso("email");
                                        }}
                                        className="text-blue-800 font-bold hover:underline"
                                    >
                                        Volver al inicio de sesión
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Productos;
