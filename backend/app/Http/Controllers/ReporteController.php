<?php

namespace App\Http\Controllers;

use App\Models\Reporte;
use App\Models\Venta;
use App\Models\Compra;
use App\Models\CompraDetalle;
use App\Models\Producto;
use App\Models\Stock;
use App\Models\VentaDetalle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ReporteController extends Controller
{
    /**
     * Listar reportes registrados.
     */
    public function index()
    {
        $reportes = Reporte::with('usuario.persona')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de reportes obtenida correctamente',
            'data' => $reportes
        ], 200);
    }

    /**
     * Registrar un reporte generado.
     */
    public function store(Request $request)
    {
        $request->validate([
            'usuarios_id' => 'required|exists:usuarios,id',
            'tipo' => 'required|string|max:100',
            'fecha_generacion' => 'nullable|date',
        ], [
            'usuarios_id.required' => 'El usuario es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',
            'tipo.required' => 'El tipo de reporte es obligatorio.',
            'tipo.string' => 'El tipo de reporte debe ser texto.',
            'tipo.max' => 'El tipo de reporte no debe superar los 100 caracteres.',
            'fecha_generacion.date' => 'La fecha de generación no es válida.',
        ]);

        $reporte = Reporte::create([
            'usuarios_id' => $request->usuarios_id,
            'tipo' => trim($request->tipo),
            'fecha_generacion' => $request->fecha_generacion ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reporte registrado correctamente',
            'data' => $reporte->load('usuario.persona')
        ], 201);
    }

    /**
     * Mostrar un reporte específico.
     */
    public function show($id)
    {
        $reporte = Reporte::with('usuario.persona')->find($id);

        if (!$reporte) {
            return response()->json([
                'success' => false,
                'message' => 'Reporte no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Reporte encontrado correctamente',
            'data' => $reporte
        ], 200);
    }

    /**
     * Actualizar reporte.
     */
    public function update(Request $request, $id)
    {
        $reporte = Reporte::find($id);

        if (!$reporte) {
            return response()->json([
                'success' => false,
                'message' => 'Reporte no encontrado'
            ], 404);
        }

        $request->validate([
            'usuarios_id' => 'required|exists:usuarios,id',
            'tipo' => 'required|string|max:100',
            'fecha_generacion' => 'nullable|date',
        ]);

        $reporte->update([
            'usuarios_id' => $request->usuarios_id,
            'tipo' => trim($request->tipo),
            'fecha_generacion' => $request->fecha_generacion ?? $reporte->fecha_generacion,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reporte actualizado correctamente',
            'data' => $reporte->load('usuario.persona')
        ], 200);
    }

    /**
     * Eliminar reporte.
     */
    public function destroy($id)
    {
        $reporte = Reporte::find($id);

        if (!$reporte) {
            return response()->json([
                'success' => false,
                'message' => 'Reporte no encontrado'
            ], 404);
        }

        $reporte->delete();

        return response()->json([
            'success' => true,
            'message' => 'Reporte eliminado correctamente'
        ], 200);
    }

    /**
     * Reporte de ventas por rango de fechas.
     */
    public function ventas(Request $request)
    {
        $datos = $request->validate([
            'periodo' => [
                'nullable',
                Rule::in(['dia', 'semana', 'mes', 'anio', 'rango']),
            ],
            'referencia' => ['nullable', 'date'],
            'fecha_inicio' => ['nullable', 'required_if:periodo,rango', 'date'],
            'fecha_fin' => [
                'nullable',
                'required_if:periodo,rango',
                'date',
                'after_or_equal:fecha_inicio',
            ],
        ]);

        $periodo = $datos['periodo'] ?? 'mes';
        $referencia = Carbon::parse($datos['referencia'] ?? today());

        [$inicio, $fin] = match ($periodo) {
            'dia' => [
                $referencia->copy()->startOfDay(),
                $referencia->copy()->endOfDay(),
            ],
            'semana' => [
                $referencia->copy()->startOfWeek()->startOfDay(),
                $referencia->copy()->endOfWeek()->endOfDay(),
            ],
            'anio' => [
                $referencia->copy()->startOfYear()->startOfDay(),
                $referencia->copy()->endOfYear()->endOfDay(),
            ],
            'rango' => [
                Carbon::parse($datos['fecha_inicio'])->startOfDay(),
                Carbon::parse($datos['fecha_fin'])->endOfDay(),
            ],
            default => [
                $referencia->copy()->startOfMonth()->startOfDay(),
                $referencia->copy()->endOfMonth()->endOfDay(),
            ],
        };

        $ventas = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'usuario.role',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'comprobante',
        ])
            ->whereBetween('fecha', [$inicio, $fin])
            ->orderBy('fecha', 'desc')
            ->get();

        $unidadesVendidas = $ventas->sum(
            fn ($venta) => $venta->detalles->sum('cantidad')
        );
        $normalizarMetodo = function ($venta) {
            $metodo = strtolower($venta->metodo_pago ?: '');

            return match (true) {
                str_contains($metodo, 'yape') => 'yape',
                str_contains($metodo, 'tarjeta') => 'tarjeta',
                str_contains($metodo, 'efectivo') => 'efectivo',
                str_contains($metodo, 'transferencia') => 'transferencia',
                default => 'otro',
            };
        };

        $ventas->each(function ($venta) use ($normalizarMetodo) {
            $rol = $venta->usuario?->role?->nombre;
            $persona = $venta->usuario?->persona;

            $venta->setAttribute(
                'metodo_pago_reporte',
                $normalizarMetodo($venta)
            );
            $venta->setAttribute(
                'vendedor_reporte',
                $venta->clientes_id
                    ? 'Sistema'
                    : ($rol === 'Administrador'
                        ? 'Administrador'
                        : ($rol === 'Vendedor' && $persona
                            ? trim($persona->nombre . ' ' . $persona->apellido)
                            : ($rol ?: 'Sistema')))
            );
        });

        $metodosPago = $ventas
            ->groupBy($normalizarMetodo)
            ->map(fn ($grupo, $metodo) => [
                'metodo' => $metodo,
                'cantidad' => $grupo->count(),
                'total' => round($grupo->sum('total'), 2),
            ])
            ->values();
        $productosVendidos = $ventas
            ->flatMap(fn ($venta) => $venta->detalles)
            ->groupBy(fn ($detalle) => $detalle->stock?->productos_id ?? 0)
            ->map(function ($detalles) {
                $primero = $detalles->first();

                return [
                    'producto' => $primero->stock?->producto?->nombre
                        ?? 'Producto no disponible',
                    'cantidad' => $detalles->sum('cantidad'),
                    'total' => round($detalles->sum('subtotal'), 2),
                ];
            })
            ->sortByDesc('cantidad')
            ->values();
        $productosMasVendidos = $productosVendidos
            ->take(10)
            ->values();
        $productosMenosVendidos = $productosVendidos
            ->sortBy(fn ($producto) => $producto['cantidad'])
            ->take(10)
            ->values();
        $resumenDiario = $ventas
            ->groupBy(fn ($venta) => Carbon::parse($venta->fecha)->toDateString())
            ->map(fn ($grupo, $fecha) => [
                'fecha' => $fecha,
                'cantidad' => $grupo->count(),
                'total' => round($grupo->sum('total'), 2),
            ])
            ->sortBy('fecha')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de ventas generado correctamente',
            'data' => [
                'periodo' => $periodo,
                'fecha_inicio' => $inicio->toDateString(),
                'fecha_fin' => $fin->toDateString(),
                'cantidad_ventas' => $ventas->count(),
                'total_ventas' => round($ventas->sum('total'), 2),
                'promedio_venta' => round($ventas->avg('total') ?? 0, 2),
                'unidades_vendidas' => $unidadesVendidas,
                'metodos_pago' => $metodosPago,
                'productos_vendidos' => $productosMasVendidos,
                'productos_menos_vendidos' => $productosMenosVendidos,
                'resumen_diario' => $resumenDiario,
                'ventas' => $ventas,
            ]
        ], 200);
    }

    /**
     * Reporte de compras por rango de fechas.
     */
    public function compras(Request $request)
    {
        $datos = $request->validate([
            'periodo' => [
                'nullable',
                Rule::in(['dia', 'semana', 'mes', 'anio', 'rango']),
            ],
            'referencia' => ['nullable', 'date'],
            'fecha_inicio' => ['nullable', 'required_if:periodo,rango', 'date'],
            'fecha_fin' => [
                'nullable',
                'required_if:periodo,rango',
                'date',
                'after_or_equal:fecha_inicio',
            ],
        ]);

        $periodo = $datos['periodo'] ?? 'mes';
        $referencia = Carbon::parse($datos['referencia'] ?? today());

        [$inicio, $fin] = match ($periodo) {
            'dia' => [
                $referencia->copy()->startOfDay(),
                $referencia->copy()->endOfDay(),
            ],
            'semana' => [
                $referencia->copy()->startOfWeek()->startOfDay(),
                $referencia->copy()->endOfWeek()->endOfDay(),
            ],
            'anio' => [
                $referencia->copy()->startOfYear()->startOfDay(),
                $referencia->copy()->endOfYear()->endOfDay(),
            ],
            'rango' => [
                Carbon::parse($datos['fecha_inicio'])->startOfDay(),
                Carbon::parse($datos['fecha_fin'])->endOfDay(),
            ],
            default => [
                $referencia->copy()->startOfMonth()->startOfDay(),
                $referencia->copy()->endOfMonth()->endOfDay(),
            ],
        };

        $compras = Compra::with([
            'proveedor',
            'usuario.persona',
            'detalles.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'pagos',
        ])
            ->whereBetween('fecha', [$inicio, $fin])
            ->orderBy('fecha', 'desc')
            ->get();

        $unidadesCompradas = $compras->sum(
            fn ($compra) => $compra->detalles->sum('cantidad')
        );
        $totalCompras = round($compras->sum('total'), 2);
        $totalPagado = round($compras->sum('monto_pagado'), 2);
        $deudaPendiente = round(max(0, $totalCompras - $totalPagado), 2);

        $resumenDiario = $compras
            ->groupBy(fn ($compra) => Carbon::parse($compra->fecha)->toDateString())
            ->map(fn ($grupo, $fecha) => [
                'fecha' => $fecha,
                'cantidad' => $grupo->count(),
                'total' => round($grupo->sum('total'), 2),
            ])
            ->sortBy('fecha')
            ->values();

        $metodosPago = $compras
            ->flatMap(fn ($compra) => $compra->pagos)
            ->groupBy(fn ($pago) => strtolower($pago->metodo ?: 'otro'))
            ->map(fn ($grupo, $metodo) => [
                'metodo' => $metodo,
                'cantidad' => $grupo->count(),
                'total' => round($grupo->sum('monto'), 2),
            ])
            ->sortByDesc('total')
            ->values();

        $proveedores = $compras
            ->groupBy('proveedores_id')
            ->map(function ($grupo) {
                $primera = $grupo->first();

                return [
                    'proveedor_id' => $primera->proveedores_id,
                    'proveedor' => $primera->proveedor?->nombre_empresa
                        ?? 'Proveedor no disponible',
                    'compras' => $grupo->count(),
                    'total' => round($grupo->sum('total'), 2),
                    'pagado' => round($grupo->sum('monto_pagado'), 2),
                    'deuda' => round(max(
                        0,
                        $grupo->sum('total') - $grupo->sum('monto_pagado')
                    ), 2),
                ];
            })
            ->sortByDesc('total')
            ->take(10)
            ->values();

        $productos = $compras
            ->flatMap(fn ($compra) => $compra->detalles)
            ->groupBy('productos_id')
            ->map(function ($detalles) {
                $primero = $detalles->first();

                return [
                    'producto_id' => $primero->productos_id,
                    'producto' => $primero->producto?->nombre
                        ?? 'Producto no disponible',
                    'cantidad' => $detalles->sum('cantidad'),
                    'total' => round($detalles->sum('subtotal'), 2),
                ];
            })
            ->sortByDesc('cantidad')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de compras generado correctamente',
            'data' => [
                'periodo' => $periodo,
                'fecha_inicio' => $inicio->toDateString(),
                'fecha_fin' => $fin->toDateString(),
                'cantidad_compras' => $compras->count(),
                'total_compras' => $totalCompras,
                'total_pagado' => $totalPagado,
                'deuda_pendiente' => $deudaPendiente,
                'promedio_compra' => round($compras->avg('total') ?? 0, 2),
                'unidades_compradas' => $unidadesCompradas,
                'resumen_diario' => $resumenDiario,
                'metodos_pago' => $metodosPago,
                'proveedores' => $proveedores,
                'productos_comprados' => $productos->take(10)->values(),
                'productos_menos_comprados' => $productos
                    ->sortBy('cantidad')
                    ->take(10)
                    ->values(),
                'compras' => $compras,
            ]
        ], 200);
    }

    /**
     * Reporte de inventario actual.
     */
    public function inventario()
    {
        $stocks = Stock::with([
            'producto.categoria',
            'producto.marca',
            'talla',
            'color'
        ])
        ->orderBy('cantidad', 'asc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de inventario generado correctamente',
            'data' => [
                'total_productos_stock' => $stocks->count(),
                'stock_total_unidades' => $stocks->sum('cantidad'),
                'inventario' => $stocks
            ]
        ], 200);
    }

    /**
     * Reporte de stock bajo.
     */
    public function stockBajo()
    {
        $stocks = Stock::with([
            'producto.categoria',
            'producto.marca',
            'talla',
            'color'
        ])
        ->whereColumn('cantidad', '<=', 'stock_minimo')
        ->orderBy('cantidad', 'asc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de stock bajo generado correctamente',
            'data' => [
                'cantidad_productos_stock_bajo' => $stocks->count(),
                'productos' => $stocks
            ]
        ], 200);
    }

    /**
     * Resumen general para dashboard.
     */
    public function dashboard(Request $request)
    {
        $usuario = $request->user()->loadMissing('role');
        $esVendedor = $usuario->role?->nombre === 'Vendedor';
        $ventasUsuario = Venta::query()
            ->when(
                $esVendedor,
                fn ($query) => $query->where('usuarios_id', $usuario->id)
            );
        $ventasHoy = Venta::whereDate('fecha', today())->sum('total');
        $comprasHoy = 0;
        $stocksBajos = collect();
        $gananciaTotal = 0;

        if (!$esVendedor) {
            $comprasHoy = Compra::whereDate('fecha', today())->sum('total');
            $stocksBajos = Stock::with([
                'producto:id,nombre',
                'talla:id,nombre',
                'color:id,nombre',
            ])
                ->whereColumn('cantidad', '<=', 'stock_minimo')
                ->orderBy('cantidad')
                ->get();

            $costosPromedio = CompraDetalle::select(
                'productos_id',
                DB::raw(
                    'SUM(subtotal) / NULLIF(SUM(cantidad), 0) as costo_promedio'
                )
            )
                ->groupBy('productos_id')
                ->pluck('costo_promedio', 'productos_id');

            $gananciaTotal = VentaDetalle::with('stock:id,productos_id')
                ->get()
                ->sum(function ($detalle) use ($costosPromedio) {
                    $productoId = $detalle->stock?->productos_id;
                    $costo = (float) ($costosPromedio[$productoId] ?? 0);

                    return (float) $detalle->subtotal
                        - ($costo * (int) $detalle->cantidad);
                });
        }

        return response()->json([
            'success' => true,
            'message' => 'Resumen general generado correctamente',
            'data' => [
                'ventas_hoy' => $esVendedor
                    ? (clone $ventasUsuario)
                        ->whereDate('fecha', today())
                        ->sum('total')
                    : $ventasHoy,
                'compras_hoy' => $esVendedor ? 0 : $comprasHoy,
                'total_productos' => Producto::count(),
                'cantidad_ventas' => (clone $ventasUsuario)->count(),
                'ganancia_total' => $esVendedor ? 0 : round($gananciaTotal, 2),
                'productos_stock_bajo' => $esVendedor
                    ? 0
                    : $stocksBajos
                        ->pluck('productos_id')
                        ->unique()
                        ->count(),
                'stocks_bajos' => $esVendedor
                    ? []
                    : $stocksBajos->values(),
                'total_ventas' => (clone $ventasUsuario)->sum('total'),
                'total_compras' => $esVendedor ? 0 : Compra::sum('total'),
                'stock_total' => $esVendedor ? 0 : Stock::sum('cantidad'),
                'perfil' => $esVendedor ? 'vendedor' : 'administrador',
            ]
        ], 200);
    }
}
