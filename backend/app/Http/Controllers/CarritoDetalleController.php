<?php

namespace App\Http\Controllers;

use App\Models\CarritoDetalle;
use App\Models\Carrito;
use App\Models\Stock;
use Illuminate\Http\Request;

class CarritoDetalleController extends Controller
{
    public function index()
    {
        $detalles = CarritoDetalle::with([
            'carrito.usuario.persona',
            'stock.producto',
            'stock.talla',
            'stock.color'
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de detalles del carrito obtenida correctamente',
            'data' => $detalles
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'carrito_id' => 'required|exists:carritos,id',
            'stocks_id' => 'required|exists:stocks,id',
            'cantidad' => 'required|integer|min:1',
            'precio' => 'required|numeric|min:0',
        ], [
            'carrito_id.required' => 'El carrito es obligatorio.',
            'carrito_id.exists' => 'El carrito seleccionado no existe.',
            'stocks_id.required' => 'El stock es obligatorio.',
            'stocks_id.exists' => 'El stock seleccionado no existe.',
            'cantidad.required' => 'La cantidad es obligatoria.',
            'cantidad.integer' => 'La cantidad debe ser un número entero.',
            'cantidad.min' => 'La cantidad debe ser mayor a 0.',
            'precio.required' => 'El precio es obligatorio.',
            'precio.numeric' => 'El precio debe ser numérico.',
            'precio.min' => 'El precio no puede ser negativo.',
        ]);

        $carrito = Carrito::find($request->carrito_id);

        if ($carrito->estado == true) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede agregar productos a un carrito finalizado'
            ], 409);
        }

        $stock = Stock::with('producto')->find($request->stocks_id);

        if ($stock->cantidad < $request->cantidad) {
            return response()->json([
                'success' => false,
                'message' => 'Stock insuficiente para el producto: ' . optional($stock->producto)->nombre,
                'stock_disponible' => $stock->cantidad
            ], 409);
        }

        $detalleExistente = CarritoDetalle::where('carrito_id', $request->carrito_id)
            ->where('stocks_id', $request->stocks_id)
            ->first();

        if ($detalleExistente) {
            $nuevaCantidad = $detalleExistente->cantidad + $request->cantidad;

            if ($stock->cantidad < $nuevaCantidad) {
                return response()->json([
                    'success' => false,
                    'message' => 'La cantidad total supera el stock disponible',
                    'stock_disponible' => $stock->cantidad
                ], 409);
            }

            $detalleExistente->update([
                'cantidad' => $nuevaCantidad,
                'precio' => $request->precio,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Producto actualizado en el carrito correctamente',
                'data' => $detalleExistente->load(['carrito', 'stock.producto'])
            ], 200);
        }

        $detalle = CarritoDetalle::create([
            'carrito_id' => $request->carrito_id,
            'stocks_id' => $request->stocks_id,
            'cantidad' => $request->cantidad,
            'precio' => $request->precio,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Producto agregado al carrito correctamente',
            'data' => $detalle->load(['carrito', 'stock.producto'])
        ], 201);
    }

    public function show($id)
    {
        $detalle = CarritoDetalle::with([
            'carrito.usuario.persona',
            'stock.producto',
            'stock.talla',
            'stock.color'
        ])->find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle del carrito no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detalle del carrito encontrado correctamente',
            'data' => $detalle
        ], 200);
    }

    public function update(Request $request, $id)
    {
        $detalle = CarritoDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle del carrito no encontrado'
            ], 404);
        }

        $request->validate([
            'stocks_id' => 'required|exists:stocks,id',
            'cantidad' => 'required|integer|min:1',
            'precio' => 'required|numeric|min:0',
        ]);

        if ($detalle->carrito->estado == true) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede modificar un carrito finalizado'
            ], 409);
        }

        $stock = Stock::with('producto')->find($request->stocks_id);

        if ($stock->cantidad < $request->cantidad) {
            return response()->json([
                'success' => false,
                'message' => 'Stock insuficiente para el producto: ' . optional($stock->producto)->nombre,
                'stock_disponible' => $stock->cantidad
            ], 409);
        }

        $detalle->update([
            'stocks_id' => $request->stocks_id,
            'cantidad' => $request->cantidad,
            'precio' => $request->precio,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Detalle del carrito actualizado correctamente',
            'data' => $detalle->load(['carrito', 'stock.producto'])
        ], 200);
    }

    public function destroy($id)
    {
        $detalle = CarritoDetalle::find($id);

        if (!$detalle) {
            return response()->json([
                'success' => false,
                'message' => 'Detalle del carrito no encontrado'
            ], 404);
        }

        if ($detalle->carrito->estado == true) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar productos de un carrito finalizado'
            ], 409);
        }

        $detalle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado del carrito correctamente'
        ], 200);
    }
}