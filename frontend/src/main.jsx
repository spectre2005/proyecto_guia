/* eslint-disable react-refresh/only-export-components */
import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
    BrowserRouter,
    Navigate,
    Route,
    Routes,
} from "react-router-dom";

import "./index.css";
import RutaPrivada from "./components/RutaPrivada";
import RutaRol from "./components/RutaRol";
import { ProductoProvider } from "./context/ProductoProvider";

const Tienda = lazy(() => import("./views/tienda/Tienda"));
const PerfilUsuario = lazy(() => import("./views/tienda/PerfilUsuario"));
const PedidosUsuario = lazy(() => import("./views/tienda/PedidosUsuario"));
const Carrito = lazy(() => import("./views/tienda/Carrito"));
const Pagos = lazy(() => import("./views/tienda/pagos"));
const PagosDetalles = lazy(() => import("./views/tienda/pagosdetalles"));
const DetalleProducto = lazy(() => import("./views/tienda/DetalleProducto"));
const PanelLayout = lazy(() => import("./layouts/PanelLayout"));

const InicioPanel = lazy(() => import("./views/panel/InicioPanel"));
const UsuariosPanel = lazy(() => import("./views/panel/UsuariosPanel"));
const ClientesPanel = lazy(() => import("./views/panel/ClientesPanel"));
const StockPanel = lazy(() => import("./views/panel/StockPanel"));
const VentasPanel = lazy(() => import("./views/panel/VentasPanel"));
const ComprasPanel = lazy(() => import("./views/panel/ComprasPanel"));
const ProveedoresPanel = lazy(() => import("./views/panel/ProveedoresPanel"));
const ReportesPanel = lazy(() => import("./views/panel/ReportesPanel"));
const AuditoriasPanel = lazy(() => import("./views/panel/AuditoriasPanel"));
const ProductosPanel = lazy(() => import("./views/panel/ProductosPanel"));
const CategoriasPanel = lazy(() => import("./views/panel/CategoriasPanel"));
const TallasPanel = lazy(() => import("./views/panel/TallasPanel"));
const ColoresPanel = lazy(() => import("./views/panel/ColoresPanel"));
const MarcasPanel = lazy(() => import("./views/panel/MarcasPanel"));
const ReporteInventarioProductos = lazy(
    () => import("./views/panel/ReporteInventarioProductos")
);
const ComprobanteVenta = lazy(
    () => import("./views/panel/ComprobanteVenta")
);
const ReporteVentasPDF = lazy(
    () => import("./views/panel/ReporteVentasPDF")
);
const ReportesCompras = lazy(
    () => import("./views/panel/reportesCompras")
);
const ReporteComprasPDF = lazy(
    () => import("./views/panel/ReporteComprasPDF")
);
const ReporteInventarioPanel = lazy(
    () => import("./views/panel/ReporteInventarioPanel")
);

const cargandoVista = (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 font-semibold text-blue-950">
        Cargando...
    </div>
);

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <ProductoProvider>
            <Suspense fallback={cargandoVista}>
                <Routes>
                    <Route path="/" element={<Tienda />} />
                    <Route
                        path="/productos/:productoId"
                        element={<DetalleProducto />}
                    />
                    <Route
                        path="/perfil"
                        element={
                            <RutaPrivada>
                                <PerfilUsuario />
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/pedidos"
                        element={
                            <RutaPrivada>
                                <PedidosUsuario />
                            </RutaPrivada>
                        }
                    />
                    <Route path="/carrito" element={<Carrito />} />
                    <Route
                        path="/pagos"
                        element={
                            <RutaPrivada>
                                <Pagos />
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/pagos/detalles/:ventaId"
                        element={
                            <RutaPrivada>
                                <PagosDetalles />
                            </RutaPrivada>
                        }
                    />

                    <Route
                        path="/panel"
                        element={
                            <RutaPrivada>
                                <RutaRol
                                    rolesPermitidos={[
                                        "Vendedor",
                                        "Administrador",
                                    ]}
                                >
                                    <PanelLayout />
                                </RutaRol>
                            </RutaPrivada>
                        }
                    >
                        <Route index element={<InicioPanel />} />
                        <Route
                            path="productos/articulos"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ProductosPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="productos/categorias"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <CategoriasPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="productos/tallas"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <TallasPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="productos/colores"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ColoresPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="productos/marcas"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <MarcasPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="stock"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <StockPanel />
                                </RutaRol>
                            }
                        />
                        <Route path="ventas" element={<VentasPanel />} />
                        <Route
                            path="ventas/registrar"
                            element={<VentasPanel />}
                        />
                        <Route
                            path="ventas/listado"
                            element={<VentasPanel />}
                        />
                        <Route
                            path="ventas/comprobantes"
                            element={<VentasPanel />}
                        />
                        <Route
                            path="personas"
                            element={
                                <Navigate
                                    to="/panel/clientes"
                                    replace
                                />
                            }
                        />
                        <Route
                            path="clientes"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ClientesPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="usuarios"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <UsuariosPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="compras"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ComprasPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="proveedores"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ProveedoresPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="reportes"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReportesPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="reportes/ventas"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReportesPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="reportes/compras"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReportesCompras />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="reportes/inventario"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReporteInventarioPanel />
                                </RutaRol>
                            }
                        />
                        <Route
                            path="auditorias"
                            element={
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <AuditoriasPanel />
                                </RutaRol>
                            }
                        />
                    </Route>

                    <Route
                        path="/panel/productos/reporte-inventario"
                        element={
                            <RutaPrivada>
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReporteInventarioProductos />
                                </RutaRol>
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/panel/comprobante-venta/:ventaId"
                        element={
                            <RutaPrivada>
                                <RutaRol
                                    rolesPermitidos={[
                                        "Vendedor",
                                        "Administrador",
                                    ]}
                                >
                                    <ComprobanteVenta />
                                </RutaRol>
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/panel/reportes/ventas/pdf"
                        element={
                            <RutaPrivada>
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReporteVentasPDF />
                                </RutaRol>
                            </RutaPrivada>
                        }
                    />
                    <Route
                        path="/panel/reportes/compras/pdf"
                        element={
                            <RutaPrivada>
                                <RutaRol rolesPermitidos={["Administrador"]}>
                                    <ReporteComprasPDF />
                                </RutaRol>
                            </RutaPrivada>
                        }
                    />
                </Routes>
            </Suspense>
        </ProductoProvider>
    </BrowserRouter>
);
