<?php

namespace App\Http\Controllers;

use App\Models\VentaDetalle;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaDetalleController extends Controller
{
    public function index()
    {
        $detalles = VentaDetalle::with([
            'venta.cliente.persona',
            'venta.usuario.persona',
            'stock.producto',
            'stock.talla',
            'stock.color'
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de detalles de venta obtenida correctamente',
            'data' => $detalles
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'ventas_id' => 'required|exists:ventas,id',
            'stocks_id' => 'required|exists:stocks,id',
            'cantidad' => 'required|integer|min:1',
            'precio_unitario' => 'required|numeric|min:0',
        ], [
            'ventas_id.required' => 'La venta es obligatoria.',
            'ventas_id.exists' => 'La venta seleccionada no existe.',
            'stocks_id.required' => 'El stock es obligatorio.',
            'stocks_id.exists' => 'El stock seleccionado no existe.',
            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad debe ser mayor a 0.',
            'precio_unitario.required' => 'El precio unitario es obligatorio.',
            'precio_unitario.numeric' => 'El precio unitario debe ser numérico.',
            'precio_unitario.min' => 'El precio no puede ser negativo.',
        ]);

        DB::beginTransaction();

        try {
            $stock = Stock::with('producto')->find($request->stocks_id);

            if ($stock->cantidad < $request->cantidad) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente para el producto: ' . optional($stock->producto)->nombre,
                    'stock_disponible' => $stock->cantidad
                ], 409);
            }

            $subtotal = $request->cantidad * $request->precio_unitario;

            $detalle = VentaDetalle::create([
                'ventas_id' => $request->ventas_id,
                'stocks_id' => $request->stocks_id,
                'cantidad' => $request->cantidad,
                'precio_unitario' => $request->precio_unitario,
                'subtotal' => $subtotal,
            ]);

            $stock->decrement('cantidad', $request->cantidad);

            $detalle->venta->update([
                'total' => $detalle->venta->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de venta registrado correctamente',
                'data' => $detalle->load(['venta', 'stock.producto'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al registrar el detalle de venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $detalle = VentaDetalle::with([
            'venta.cliente.persona',
            'venta.usuario.persona',
            'stock.producto',
            'stock.talla',
            'stock.color'
        ])->find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de venta no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detalle de venta encontrado correctamente',
            'data' => $detalle
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $detalle = VentaDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de venta no encontrado'
            ], 404);
        }

        $request->validate([
            'stocks_id' => 'required|exists:stocks,id',
            'cantidad' => 'required|integer|min:1',
            'precio_unitario' => 'required|numeric|min:0',
        ], [
            'stocks_id.required' => 'El stock es obligatorio.',
            'stocks_id.exists' => 'El stock seleccionado no existe.',
            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad debe ser mayor a 0.',
            'precio_unitario.required' => 'El precio unitario es obligatorio.',
            'precio_unitario.numeric' => 'El precio unitario debe ser numérico.',
            'precio_unitario.min' => 'El precio no puede ser negativo.',
        ]);

        DB::beginTransaction();

        try {
            $stockAnterior = Stock::find($detalle->stocks_id);

            if ($stockAnterior) {
                $stockAnterior->increment('cantidad', $detalle->cantidad);
            }

            $stockNuevo = Stock::with('producto')->find($request->stocks_id);

            if ($stockNuevo->cantidad < $request->cantidad) {
                return response()->json([
                    'success' => false,
                    'message' => 'Stock insuficiente para el producto: ' . optional($stockNuevo->producto)->nombre,
                    'stock_disponible' => $stockNuevo->cantidad
                ], 409);
            }

            $subtotal = $request->cantidad * $request->precio_unitario;

            $detalle->update([
                'stocks_id' => $request->stocks_id,
                'cantidad' => $request->cantidad,
                'precio_unitario' => $request->precio_unitario,
                'subtotal' => $subtotal,
            ]);

            $stockNuevo->decrement('cantidad', $request->cantidad);

            $detalle->venta->update([
                'total' => $detalle->venta->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de venta actualizado correctamente',
                'data' => $detalle->load(['venta', 'stock.producto'])
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el detalle de venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $detalle = VentaDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de venta no encontrado'
            ], 404);
        }

        DB::beginTransaction();

        try {
            $venta = $detalle->venta;

            $stock = Stock::find($detalle->stocks_id);

            if ($stock) {
                $stock->increment('cantidad', $detalle->cantidad);
            }

            $detalle->delete();

            $venta->update([
                'total' => $venta->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de venta eliminado correctamente y stock restaurado'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el detalle de venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}