<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\PagoProveedor;
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
            'detalles.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'pagos.usuario.persona'
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

            'numero_documento' => ['nullable', 'string', 'max:50'],
            'fecha_vencimiento' => ['nullable', 'date', 'after_or_equal:fecha'],
            'pago_inicial' => ['nullable', 'numeric', 'min:0'],
            'metodo_pago' => [
                'nullable',
                'in:efectivo,transferencia,yape,tarjeta,otro'
            ],
            'referencia_pago' => ['nullable', 'string', 'max:100'],
            'observaciones' => ['nullable', 'string', 'max:1000'],

            'detalles' => [
                'required',
                'array',
                'min:1'
            ],

            'detalles.*.productos_id' => [
                'required',
                'exists:productos,id'
            ],

            'detalles.*.stocks_id' => [
                'required',
                'exists:stocks,id'
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
                $stock = Stock::where('id', $detalle['stocks_id'])
                    ->where('productos_id', $detalle['productos_id'])
                    ->first();

                if (!$stock) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'La variante seleccionada no pertenece al producto.',
                    ], 422);
                }

                $total += $detalle['cantidad'] * $detalle['precio'];
            }

            $pagoInicial = (float) ($request->pago_inicial ?? 0);

            if ($pagoInicial > $total) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'El pago inicial no puede superar el total de la compra.',
                ], 422);
            }

            $compra = Compra::create([
                'proveedores_id' => $request->proveedores_id,
                'usuarios_id' => $request->usuarios_id,
                'fecha' => $request->fecha,
                'numero_documento' => $request->numero_documento,
                'fecha_vencimiento' => $request->fecha_vencimiento,
                'total' => $total,
                'monto_pagado' => $pagoInicial,
                'estado_pago' => $pagoInicial >= $total
                    ? 'pagado'
                    : ($pagoInicial > 0 ? 'parcial' : 'pendiente'),
                'observaciones' => $request->observaciones,
            ]);

            if ($pagoInicial > 0) {
                PagoProveedor::create([
                    'proveedores_id' => $request->proveedores_id,
                    'compras_id' => $compra->id,
                    'usuarios_id' => $request->usuarios_id,
                    'fecha' => $request->fecha,
                    'monto' => $pagoInicial,
                    'metodo' => $request->metodo_pago ?: 'efectivo',
                    'referencia' => $request->referencia_pago,
                    'observacion' => 'Pago inicial de la compra',
                ]);
            }

            foreach ($request->detalles as $detalle) {

                $subtotal = $detalle['cantidad'] * $detalle['precio'];

                $compra->detalles()->create([
                    'productos_id' => $detalle['productos_id'],
                    'stocks_id' => $detalle['stocks_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio' => $detalle['precio'],
                    'subtotal' => $subtotal,
                ]);

                Stock::where('id', $detalle['stocks_id'])
                    ->increment('cantidad', $detalle['cantidad']);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Compra registrada correctamente',
                'data' => $compra->load([
                    'proveedor',
                    'usuario.persona',
                    'detalles.producto',
                    'detalles.stock.talla',
                    'detalles.stock.color',
                    'pagos'
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
            'detalles.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'pagos.usuario.persona'
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
        $compra = Compra::with(['detalles.stock', 'pagos'])->find($id);

        if (!$compra) {
            return response()->json([
                'success' => false,
                'message' => 'Compra no encontrada'
            ], 404);
        }

        DB::beginTransaction();

        try {
            foreach ($compra->detalles as $detalle) {
                $stock = $detalle->stock;

                if (!$stock || $stock->cantidad < $detalle->cantidad) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => 'No se puede anular la compra porque parte de ese stock ya fue vendido o no está disponible.',
                    ], 409);
                }
            }

            foreach ($compra->detalles as $detalle) {
                $detalle->stock->decrement('cantidad', $detalle->cantidad);
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
