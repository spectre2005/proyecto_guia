import { Link, Outlet, useLocation } from "react-router-dom";
import { useState } from "react";

const PanelLayout = () => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));
    const rol = usuario?.role?.nombre;
    const location = useLocation();

    const [productosAbierto, setProductosAbierto] = useState(
        location.pathname.includes("/panel/productos")
    );

    const [ventasAbierto, setVentasAbierto] = useState(
        location.pathname.includes("/panel/ventas")
    );

    const [personasAbierto, setPersonasAbierto] = useState(
        location.pathname.includes("/panel/clientes") ||
            location.pathname.includes("/panel/proveedores") ||
            location.pathname.includes("/panel/usuarios")
    );

    const [reportesAbierto, setReportesAbierto] = useState(
        location.pathname.includes("/panel/reportes")
    );

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "/";
    };

    const linkClass = (path) =>
        `block px-4 py-3 rounded ${
            location.pathname === path
                ? "bg-blue-900 text-yellow-300 font-bold"
                : "hover:bg-blue-900"
        }`;

    return (
        <div className="flex min-h-screen items-start bg-slate-100">
            <aside className="sticky top-0 h-screen w-72 shrink-0 overflow-y-auto bg-blue-950 p-5 text-white">
                <h1 className="text-2xl font-bold mb-1">Panel del Sistema</h1>
                <p className="text-blue-200 text-sm mb-6">Rol: {rol}</p>

                <nav className="space-y-2">
                    <Link to="/panel" className={linkClass("/panel")}>
                        Inicio
                    </Link>

                    {rol === "Administrador" && (
                        <>
                            <button
                                onClick={() =>
                                    setProductosAbierto(!productosAbierto)
                                }
                                className="flex w-full items-center justify-between rounded px-4 py-3 hover:bg-blue-900"
                            >
                                <span>Productos</span>
                                <span>{productosAbierto ? "▲" : "▼"}</span>
                            </button>

                            {productosAbierto && (
                                <div className="ml-4 space-y-1 border-l border-blue-800 pl-3">
                                    <Link to="/panel/productos/articulos" className={linkClass("/panel/productos/articulos")}>
                                        Artículos
                                    </Link>
                                    <Link to="/panel/productos/categorias" className={linkClass("/panel/productos/categorias")}>
                                        Categorías
                                    </Link>
                                    <Link to="/panel/productos/tallas" className={linkClass("/panel/productos/tallas")}>
                                        Tallas
                                    </Link>
                                    <Link to="/panel/productos/colores" className={linkClass("/panel/productos/colores")}>
                                        Colores
                                    </Link>
                                    <Link to="/panel/productos/marcas" className={linkClass("/panel/productos/marcas")}>
                                        Marcas
                                    </Link>
                                </div>
                            )}
                        </>
                    )}

                    <button
                        onClick={() => setVentasAbierto(!ventasAbierto)}
                        className="w-full flex justify-between items-center px-4 py-3 rounded hover:bg-blue-900"
                    >
                        <span>Ventas</span>
                        <span>{ventasAbierto ? "▲" : "▼"}</span>
                    </button>

                    {ventasAbierto && (
                        <div className="ml-4 space-y-1 border-l border-blue-800 pl-3">
                            <Link to="/panel/ventas/registrar" className={linkClass("/panel/ventas/registrar")}>
                                Registrar venta
                            </Link>

                            <Link to="/panel/ventas/listado" className={linkClass("/panel/ventas/listado")}>
                                Listado de ventas
                            </Link>

                            <Link to="/panel/ventas/comprobantes" className={linkClass("/panel/ventas/comprobantes")}>
                                Comprobantes
                            </Link>
                        </div>
                    )}

                    {rol === "Administrador" && (
                        <>
                            <button
                                onClick={() =>
                                    setPersonasAbierto(!personasAbierto)
                                }
                                className="flex w-full items-center justify-between rounded px-4 py-3 hover:bg-blue-900"
                            >
                                <span>Clientes y usuarios</span>
                                <span>{personasAbierto ? "▲" : "▼"}</span>
                            </button>

                            {personasAbierto && (
                                <div className="ml-4 space-y-1 border-l border-blue-800 pl-3">
                                    <Link to="/panel/clientes" className={linkClass("/panel/clientes")}>
                                        Clientes
                                    </Link>
                                    <Link to="/panel/usuarios" className={linkClass("/panel/usuarios")}>
                                        Usuarios
                                    </Link>
                                    <Link to="/panel/proveedores" className={linkClass("/panel/proveedores")}>
                                        Proveedores
                                    </Link>
                                </div>
                            )}

                            <Link to="/panel/compras" className={linkClass("/panel/compras")}>
                                Compras
                            </Link>

                            <button
                                onClick={() => setReportesAbierto(!reportesAbierto)}
                                className="w-full flex justify-between items-center px-4 py-3 rounded hover:bg-blue-900"
                            >
                                <span>Reportes</span>
                                <span>{reportesAbierto ? "▲" : "▼"}</span>
                            </button>

                            {reportesAbierto && (
                                <div className="ml-4 space-y-1 border-l border-blue-800 pl-3">
                                    <Link to="/panel/reportes/ventas" className={linkClass("/panel/reportes/ventas")}>
                                        Reporte de ventas
                                    </Link>

                                    <Link to="/panel/reportes/inventario" className={linkClass("/panel/reportes/inventario")}>
                                        Reporte de inventario
                                    </Link>

                                    <Link to="/panel/reportes/compras" className={linkClass("/panel/reportes/compras")}>
                                        Reporte de compras
                                    </Link>
                                </div>
                            )}

                            <Link to="/panel/auditorias" className={linkClass("/panel/auditorias")}>
                                Auditorías
                            </Link>
                        </>
                    )}
                </nav>

                <button
                    onClick={cerrarSesion}
                    className="mt-8 w-full bg-red-500 hover:bg-red-600 py-3 rounded font-bold"
                >
                    Cerrar sesión
                </button>
            </aside>

            <main className="min-w-0 flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default PanelLayout;
