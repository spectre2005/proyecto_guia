<?php

namespace App\Http\Controllers;

use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
    /**
     * Listar todos los stocks.
     */
    public function index()
    {
        $stocks = Stock::with(['producto.categoria', 'producto.marca', 'talla', 'color'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de stock obtenida correctamente',
            'data' => $stocks
        ], 200);
    }

    /**
     * Registrar stock de un producto.
     */
    public function store(Request $request)
    {
        $request->validate([
            'productos_id' => [
                'required',
                'exists:productos,id'
            ],
            'tallas_id' => [
                'nullable',
                'exists:tallas,id'
            ],
            'colores_id' => [
                'nullable',
                'exists:colores,id'
            ],
            'cantidad' => [
                'required',
                'integer',
                'min:0'
            ],
            'stock_minimo' => [
                'nullable',
                'integer',
                'min:0'
            ],
        ], [
            'productos_id.required' => 'El producto es obligatorio.',
            'productos_id.exists' => 'El producto seleccionado no existe.',

            'tallas_id.exists' => 'La talla seleccionada no existe.',
            'colores_id.exists' => 'El color seleccionado no existe.',

            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad no puede ser negativa.',

            'stock_minimo.integer' => 'El stock mínimo debe ser un número entero.',
            'stock_minimo.min' => 'El stock mínimo no puede ser negativo.',
        ]);

        $existeStock = Stock::where('productos_id', $request->productos_id)
            ->where('tallas_id', $request->tallas_id)
            ->where('colores_id', $request->colores_id)
            ->exists();

        if ($existeStock) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe stock registrado para este producto con la misma talla y color'
            ], 409);
        }

        $stock = Stock::create([
            'productos_id' => $request->productos_id,
            'tallas_id' => $request->tallas_id,
            'colores_id' => $request->colores_id,
            'cantidad' => $request->cantidad,
            'stock_minimo' => $request->stock_minimo ?? 5,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stock registrado correctamente',
            'data' => $stock->load(['producto', 'talla', 'color'])
        ], 201);
    }

    /**
     * Mostrar un stock específico.
     */
    public function show($id)
    {
        $stock = Stock::with(['producto.categoria', 'producto.marca', 'talla', 'color'])
            ->find($id);

        if (!$stock) {
            return response()->json([
                'success' => false,
                'message' => 'Stock no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Stock encontrado correctamente',
            'data' => $stock
        ], 200);
    }

    /**
     * Actualizar stock.
     */
    public function update(Request $request, $id)
    {
        $stock = Stock::find($id);

        if (!$stock) {
            return response()->json([
                'success' => false,
                'message' => 'Stock no encontrado'
            ], 404);
        }

        $request->validate([
            'productos_id' => [
                'required',
                'exists:productos,id'
            ],
            'tallas_id' => [
                'nullable',
                'exists:tallas,id'
            ],
            'colores_id' => [
                'nullable',
                'exists:colores,id'
            ],
            'cantidad' => [
                'required',
                'integer',
                'min:0'
            ],
            'stock_minimo' => [
                'nullable',
                'integer',
                'min:0'
            ],
        ], [
            'productos_id.required' => 'El producto es obligatorio.',
            'productos_id.exists' => 'El producto seleccionado no existe.',

            'tallas_id.exists' => 'La talla seleccionada no existe.',
            'colores_id.exists' => 'El color seleccionado no existe.',

            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad no puede ser negativa.',

            'stock_minimo.integer' => 'El stock mínimo debe ser un número entero.',
            'stock_minimo.min' => 'El stock mínimo no puede ser negativo.',
        ]);

        $existeStock = Stock::where('productos_id', $request->productos_id)
            ->where('tallas_id', $request->tallas_id)
            ->where('colores_id', $request->colores_id)
            ->where('id', '!=', $stock->id)
            ->exists();

        if ($existeStock) {
            return response()->json([
                'success' => false,
                'message' => 'Ya existe otro registro con este producto, talla y color'
            ], 409);
        }

        $stock->update([
            'productos_id' => $request->productos_id,
            'tallas_id' => $request->tallas_id,
            'colores_id' => $request->colores_id,
            'cantidad' => $request->cantidad,
            'stock_minimo' => $request->stock_minimo ?? 5,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Stock actualizado correctamente',
            'data' => $stock->load(['producto', 'talla', 'color'])
        ], 200);
    }

    /**
     * Eliminar stock.
     */
    public function destroy($id)
    {
        $stock = Stock::withCount(['ventaDetalles', 'carritoDetalles'])->find($id);

        if (!$stock) {
            return response()->json([
                'success' => false,
                'message' => 'Stock no encontrado'
            ], 404);
        }

        if ($stock->venta_detalles_count > 0 || $stock->carrito_detalles_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el stock porque tiene ventas o carritos asociados'
            ], 409);
        }

        $stock->delete();

        return response()->json([
            'success' => true,
            'message' => 'Stock eliminado correctamente'
        ], 200);
    }

    /**
     * Listar productos con stock bajo.
     */
    public function stockBajo()
    {
        $stocks = Stock::with(['producto', 'talla', 'color'])
            ->whereColumn('cantidad', '<=', 'stock_minimo')
            ->orderBy('cantidad', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de productos con stock bajo obtenida correctamente',
            'data' => $stocks
        ], 200);
    }
}