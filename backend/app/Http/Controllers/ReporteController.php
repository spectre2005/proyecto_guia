<?php

namespace App\Http\Controllers;

use App\Models\Reporte;
use App\Models\Venta;
use App\Models\Compra;
use App\Models\Stock;
use Illuminate\Http\Request;

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
        $request->validate([
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
        ]);

        $ventas = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'comprobante'
        ])
        ->whereBetween('fecha', [$request->fecha_inicio, $request->fecha_fin])
        ->orderBy('fecha', 'desc')
        ->get();

        $totalVentas = $ventas->sum('total');
        $cantidadVentas = $ventas->count();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de ventas generado correctamente',
            'data' => [
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin' => $request->fecha_fin,
                'cantidad_ventas' => $cantidadVentas,
                'total_ventas' => $totalVentas,
                'ventas' => $ventas
            ]
        ], 200);
    }

    /**
     * Reporte de compras por rango de fechas.
     */
    public function compras(Request $request)
    {
        $request->validate([
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
        ]);

        $compras = Compra::with([
            'proveedor',
            'usuario.persona',
            'detalles.producto'
        ])
        ->whereBetween('fecha', [$request->fecha_inicio, $request->fecha_fin])
        ->orderBy('fecha', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Reporte de compras generado correctamente',
            'data' => [
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin' => $request->fecha_fin,
                'cantidad_compras' => $compras->count(),
                'total_compras' => $compras->sum('total'),
                'compras' => $compras
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
    public function dashboard()
    {
        $ventasHoy = Venta::whereDate('fecha', today())->sum('total');
        $comprasHoy = Compra::whereDate('fecha', today())->sum('total');
        $stockBajo = Stock::whereColumn('cantidad', '<=', 'stock_minimo')->count();

        return response()->json([
            'success' => true,
            'message' => 'Resumen general generado correctamente',
            'data' => [
                'ventas_hoy' => $ventasHoy,
                'compras_hoy' => $comprasHoy,
                'productos_stock_bajo' => $stockBajo,
                'total_ventas' => Venta::sum('total'),
                'total_compras' => Compra::sum('total'),
                'stock_total' => Stock::sum('cantidad'),
            ]
        ], 200);
    }
}