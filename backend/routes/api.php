<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\RoleController;
use App\Http\Controllers\PersonaController;
use App\Http\Controllers\UsuarioController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\MarcaController;
use App\Http\Controllers\MaterialeController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\TallaController;
use App\Http\Controllers\ColorController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ProveedorController;
use App\Http\Controllers\CompraController;
use App\Http\Controllers\CompraDetalleController;
use App\Http\Controllers\VentaController;
use App\Http\Controllers\VentaDetalleController;
use App\Http\Controllers\CarritoController;
use App\Http\Controllers\CarritoDetalleController;
use App\Http\Controllers\ComprobanteController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\Api\AuthController;

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('recuperar-password', [AuthController::class, 'solicitarRecuperacion']);
Route::post('restablecer-password', [AuthController::class, 'restablecerPassword']);

Route::get('productos', [ProductoController::class, 'index']);
Route::get('productos/{producto}', [ProductoController::class, 'show']);
Route::get('categorias', [CategoriaController::class, 'index']);
Route::get('categorias/{categoria}', [CategoriaController::class, 'show']);
Route::get('marcas', [MarcaController::class, 'index']);
Route::get('marcas/{marca}', [MarcaController::class, 'show']);
Route::get('materiales', [MaterialeController::class, 'index']);
Route::get('materiales/{materiale}', [MaterialeController::class, 'show']);
Route::get('tallas', [TallaController::class, 'index']);
Route::get('tallas/{talla}', [TallaController::class, 'show']);
Route::get('colores', [ColorController::class, 'index']);
Route::get('colores/{colore}', [ColorController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('mi-cuenta', [AuthController::class, 'miCuenta']);
    Route::put('mi-cuenta', [AuthController::class, 'actualizarMiCuenta']);
    Route::put('mi-cuenta/password', [AuthController::class, 'cambiarMiPassword']);
    Route::get('mi-carrito', [CarritoController::class, 'miCarrito']);
    Route::post('mi-carrito/items', [CarritoController::class, 'agregarAMiCarrito']);
    Route::put('mi-carrito/items/{detalle}', [CarritoController::class, 'actualizarItemMiCarrito']);
    Route::delete('mi-carrito/items/{detalle}', [CarritoController::class, 'eliminarItemMiCarrito']);
    Route::delete('mi-carrito', [CarritoController::class, 'vaciarMiCarrito']);
    Route::post('mi-compra/finalizar', [VentaController::class, 'finalizarMiCompra']);
    Route::get('mi-compras/{venta}', [VentaController::class, 'miCompra']);

    Route::get('perfil', function (Request $request) {
        return $request->user();
    });
});

Route::middleware(['auth:sanctum', 'role:Administrador,Vendedor'])
    ->group(function () {
        Route::get('dashboard', [ReporteController::class, 'dashboard']);

        Route::get('ventas', [VentaController::class, 'index']);
        Route::post('ventas', [VentaController::class, 'store']);
        Route::get('ventas/{venta}', [VentaController::class, 'show']);

        Route::get('comprobantes', [ComprobanteController::class, 'index']);
        Route::post('comprobantes', [ComprobanteController::class, 'store']);
        Route::get('comprobantes/buscar/{numero}', [ComprobanteController::class, 'buscarPorNumero']);
        Route::get('comprobantes/{comprobante}', [ComprobanteController::class, 'show']);
    });

Route::middleware(['auth:sanctum', 'role:Administrador'])
    ->group(function () {
        Route::apiResource('auditorias', AuditoriaController::class);
        Route::get('auditorias-usuario/{usuarios_id}', [AuditoriaController::class, 'porUsuario']);
        Route::get('auditorias-tabla/{tabla}', [AuditoriaController::class, 'porTabla']);

        Route::apiResource('reportes', ReporteController::class);
        Route::get('reportes-ventas', [ReporteController::class, 'ventas']);
        Route::get('reportes-compras', [ReporteController::class, 'compras']);
        Route::get('reportes-inventario', [ReporteController::class, 'inventario']);
        Route::get('reportes-stock-bajo', [ReporteController::class, 'stockBajo']);

        Route::put('comprobantes/{comprobante}', [ComprobanteController::class, 'update']);
        Route::delete('comprobantes/{comprobante}', [ComprobanteController::class, 'destroy']);
        Route::delete('ventas/{venta}', [VentaController::class, 'destroy']);

        Route::apiResource('carrito-detalles', CarritoDetalleController::class);
        Route::apiResource('carritos', CarritoController::class);
        Route::get('usuarios/{usuarios_id}/carrito-activo', [CarritoController::class, 'carritoActivo']);
        Route::delete('carritos/{id}/vaciar', [CarritoController::class, 'vaciar']);
        Route::apiResource('venta-detalles', VentaDetalleController::class);
        Route::apiResource('compra-detalles', CompraDetalleController::class);
        Route::apiResource('compras', CompraController::class);
        Route::apiResource('proveedores', ProveedorController::class);
        Route::post('proveedores/{id}/pagos', [ProveedorController::class, 'registrarPago']);
        Route::apiResource('clientes', ClienteController::class);

        Route::get('stocks', [StockController::class, 'index']);
        Route::get('stocks-bajo', [StockController::class, 'stockBajo']);
        Route::get('stocks/{stock}', [StockController::class, 'show']);
        Route::post('stocks', [StockController::class, 'store']);
        Route::put('stocks/{stock}', [StockController::class, 'update']);
        Route::patch('stocks/{id}/incrementar', [StockController::class, 'incrementar']);
        Route::delete('stocks/{stock}', [StockController::class, 'destroy']);

        Route::post('productos', [ProductoController::class, 'store']);
        Route::put('productos/{producto}', [ProductoController::class, 'update']);
        Route::delete('productos/{producto}', [ProductoController::class, 'destroy']);
        Route::apiResource('marcas', MarcaController::class)->except(['index', 'show']);
        Route::apiResource('materiales', MaterialeController::class)->except(['index', 'show']);
        Route::apiResource('categorias', CategoriaController::class)->except(['index', 'show']);
        Route::apiResource('tallas', TallaController::class)->except(['index', 'show']);
        Route::apiResource('colores', ColorController::class)->except(['index', 'show']);

        Route::put('usuarios/{id}/rol-estado', [UsuarioController::class, 'cambiarRolEstado']);
        Route::apiResource('usuarios', UsuarioController::class);
        Route::apiResource('personas', PersonaController::class);
        Route::apiResource('roles', RoleController::class);
    });
