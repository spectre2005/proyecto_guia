<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CompraController extends Controller
{
    /**
     * Listar todas las compras.
     */
    public function index()
    {
        $compras = Compra::with([
            'proveedor',
            'usuario.persona',
            'detalles.producto'
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de compras obtenida correctamente',
            'data' => $compras
        ], 200);
    }

    /**
     * Registrar una nueva compra.
     */
    public function store(Request $request)
    {
        $request->validate([
            'proveedores_id' => [
                'required',
                'exists:proveedores,id'
            ],

            'usuarios_id' => [
                'required',
                'exists:usuarios,id'
            ],

            'fecha' => [
                'required',
                'date'
            ],

            'detalles' => [
                'required',
                'array',
                'min:1'
            ],

            'detalles.*.productos_id' => [
                'required',
                'exists:productos,id'
            ],

            'detalles.*.cantidad' => [
                'required',
                'integer',
                'min:1'
            ],

            'detalles.*.precio' => [
                'required',
                'numeric',
                'min:0'
            ],

        ], [

            'proveedores_id.required' => 'El proveedor es obligatorio.',
            'proveedores_id.exists' => 'El proveedor seleccionado no existe.',

            'usuarios_id.required' => 'El usuario es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',

            'fecha.required' => 'La fecha es obligatoria.',
            'fecha.date' => 'La fecha no es válida.',

            'detalles.required' => 'Debe agregar al menos un producto.',
            'detalles.array' => 'Los detalles deben enviarse en formato arreglo.',
            'detalles.min' => 'Debe agregar al menos un producto.',

            'detalles.*.productos_id.required' => 'El producto es obligatorio.',
            'detalles.*.productos_id.exists' => 'El producto seleccionado no existe.',

            'detalles.*.cantidad.required' => 'La cantidad es obligatoria.',
            'detalles.*.cantidad.integer' => 'La cantidad debe ser un número entero.',
            'detalles.*.cantidad.min' => 'La cantidad debe ser mayor a 0.',

            'detalles.*.precio.required' => 'El precio es obligatorio.',
            'detalles.*.precio.numeric' => 'El precio debe ser numérico.',
            'detalles.*.precio.min' => 'El precio no puede ser negativo.',
        ]);

        DB::beginTransaction();

        try {

            $total = 0;

            foreach ($request->detalles as $detalle) {
                $total += $detalle['cantidad'] * $detalle['precio'];
            }

            $compra = Compra::create([
                'proveedores_id' => $request->proveedores_id,
                'usuarios_id' => $request->usuarios_id,
                'fecha' => $request->fecha,
                'total' => $total,
            ]);

            foreach ($request->detalles as $detalle) {

                $subtotal = $detalle['cantidad'] * $detalle['precio'];

                $compra->detalles()->create([
                    'productos_id' => $detalle['productos_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio' => $detalle['precio'],
                    'subtotal' => $subtotal,
                ]);

                /**
                 * Actualizar stock
                 */

                $stock = Stock::where('productos_id', $detalle['productos_id'])
                    ->first();

                if ($stock) {

                    $stock->increment('cantidad', $detalle['cantidad']);

                } else {

                    Stock::create([
                        'productos_id' => $detalle['productos_id'],
                        'cantidad' => $detalle['cantidad'],
                        'stock_minimo' => 5,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compra registrada correctamente',
                'data' => $compra->load([
                    'proveedor',
                    'usuario.persona',
                    'detalles.producto'
                ])
            ], 201);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al registrar la compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mostrar una compra específica.
     */
    public function show($id)
    {
        $compra = Compra::with([
            'proveedor',
            'usuario.persona',
            'detalles.producto'
        ])->find($id);

        if (!$compra) {
            return response()->json([
                'success' => false,
                'message' => 'Compra no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Compra encontrada correctamente',
            'data' => $compra
        ], 200);
    }

    /**
     * Eliminar compra.
     */
    public function destroy($id)
    {
        $compra = Compra::with('detalles')->find($id);

        if (!$compra) {
            return response()->json([
                'success' => false,
                'message' => 'Compra no encontrada'
            ], 404);
        }

        DB::beginTransaction();

        try {

            /**
             * Restar stock
             */
            foreach ($compra->detalles as $detalle) {

                $stock = Stock::where('productos_id', $detalle->productos_id)
                    ->first();

                if ($stock) {

                    $nuevoStock = $stock->cantidad - $detalle->cantidad;

                    if ($nuevoStock < 0) {
                        $nuevoStock = 0;
                    }

                    $stock->update([
                        'cantidad' => $nuevoStock
                    ]);
                }
            }

            $compra->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compra eliminada correctamente'
            ], 200);

        } catch (\Exception $e) {

            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la compra',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}