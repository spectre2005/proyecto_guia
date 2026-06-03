<?php

namespace App\Http\Controllers;

use App\Models\CompraDetalle;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompraDetalleController extends Controller
{
    public function index()
    {
        $detalles = CompraDetalle::with(['compra.proveedor', 'producto'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de detalles de compra obtenida correctamente',
            'data' => $detalles
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'compras_id' => 'required|exists:compras,id',
            'productos_id' => 'required|exists:productos,id',
            'cantidad' => 'required|integer|min:1',
            'precio' => 'required|numeric|min:0',
        ], [
            'compras_id.required' => 'La compra es obligatoria.',
            'compras_id.exists' => 'La compra seleccionada no existe.',
            'productos_id.required' => 'El producto es obligatorio.',
            'productos_id.exists' => 'El producto seleccionado no existe.',
            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad debe ser mayor a 0.',
            'precio.required' => 'El precio es obligatorio.',
            'precio.numeric' => 'El precio debe ser numérico.',
            'precio.min' => 'El precio no puede ser negativo.',
        ]);

        DB::beginTransaction();

        try {
            $subtotal = $request->cantidad * $request->precio;

            $detalle = CompraDetalle::create([
                'compras_id' => $request->compras_id,
                'productos_id' => $request->productos_id,
                'cantidad' => $request->cantidad,
                'precio' => $request->precio,
                'subtotal' => $subtotal,
            ]);

            $stock = Stock::where('productos_id', $request->productos_id)->first();

            if ($stock) {
                $stock->increment('cantidad', $request->cantidad);
            } else {
                Stock::create([
                    'productos_id' => $request->productos_id,
                    'cantidad' => $request->cantidad,
                    'stock_minimo' => 5,
                ]);
            }

            $detalle->compra->update([
                'total' => $detalle->compra->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de compra registrado correctamente',
                'data' => $detalle->load(['compra', 'producto'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al registrar el detalle de compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $detalle = CompraDetalle::with(['compra.proveedor', 'producto'])->find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de compra no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detalle de compra encontrado correctamente',
            'data' => $detalle
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $detalle = CompraDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de compra no encontrado'
            ], 404);
        }

        $request->validate([
            'productos_id' => 'required|exists:productos,id',
            'cantidad' => 'required|integer|min:1',
            'precio' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();

        try {
            $stockAnterior = Stock::where('productos_id', $detalle->productos_id)->first();

            if ($stockAnterior) {
                $stockAnterior->decrement('cantidad', $detalle->cantidad);
            }

            $subtotal = $request->cantidad * $request->precio;

            $detalle->update([
                'productos_id' => $request->productos_id,
                'cantidad' => $request->cantidad,
                'precio' => $request->precio,
                'subtotal' => $subtotal,
            ]);

            $stockNuevo = Stock::where('productos_id', $request->productos_id)->first();

            if ($stockNuevo) {
                $stockNuevo->increment('cantidad', $request->cantidad);
            } else {
                Stock::create([
                    'productos_id' => $request->productos_id,
                    'cantidad' => $request->cantidad,
                    'stock_minimo' => 5,
                ]);
            }

            $detalle->compra->update([
                'total' => $detalle->compra->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de compra actualizado correctamente',
                'data' => $detalle->load(['compra', 'producto'])
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar el detalle de compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $detalle = CompraDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle de compra no encontrado'
            ], 404);
        }

        DB::beginTransaction();

        try {
            $compra = $detalle->compra;

            $stock = Stock::where('productos_id', $detalle->productos_id)->first();

            if ($stock) {
                $nuevoStock = $stock->cantidad - $detalle->cantidad;

                $stock->update([
                    'cantidad' => max($nuevoStock, 0)
                ]);
            }

            $detalle->delete();

            $compra->update([
                'total' => $compra->detalles()->sum('subtotal')
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Detalle de compra eliminado correctamente'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar el detalle de compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}