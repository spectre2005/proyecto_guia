<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\Stock;
use App\Models\Comprobante;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VentaController extends Controller
{
    public function index()
    {
        $ventas = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'comprobante'
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de ventas obtenida correctamente',
            'data' => $ventas
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'clientes_id' => 'nullable|exists:clientes,id',
            'usuarios_id' => 'required|exists:usuarios,id',
            'fecha' => 'required|date',
            'metodo_pago' => 'required|string|max:50',
            'estado' => 'nullable|string|max:50',

            'detalles' => 'required|array|min:1',
            'detalles.*.stocks_id' => 'required|exists:stocks,id',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.precio_unitario' => 'required|numeric|min:0',

            'comprobante.tipo' => 'nullable|string|max:50',
            'comprobante.numero' => 'nullable|string|max:50|unique:comprobantes,numero',
        ], [
            'usuarios_id.required' => 'El usuario vendedor es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',

            'clientes_id.exists' => 'El cliente seleccionado no existe.',

            'fecha.required' => 'La fecha de venta es obligatoria.',
            'fecha.date' => 'La fecha no es válida.',

            'metodo_pago.required' => 'El método de pago es obligatorio.',
            'metodo_pago.string' => 'El método de pago debe ser texto.',
            'metodo_pago.max' => 'El método de pago no debe superar los 50 caracteres.',

            'detalles.required' => 'Debe agregar al menos un producto a la venta.',
            'detalles.array' => 'Los detalles deben enviarse como arreglo.',
            'detalles.min' => 'Debe agregar al menos un producto.',

            'detalles.*.stocks_id.required' => 'El stock del producto es obligatorio.',
            'detalles.*.stocks_id.exists' => 'El stock seleccionado no existe.',

            'detalles.*.cantidad.required' => 'La cantidad es obligatoria.',
            'detalles.*.cantidad.integer' => 'La cantidad debe ser un número entero.',
            'detalles.*.cantidad.min' => 'La cantidad debe ser mayor a 0.',

            'detalles.*.precio_unitario.required' => 'El precio unitario es obligatorio.',
            'detalles.*.precio_unitario.numeric' => 'El precio unitario debe ser numérico.',
            'detalles.*.precio_unitario.min' => 'El precio no puede ser negativo.',

            'comprobante.numero.unique' => 'El número de comprobante ya está registrado.',
        ]);

        DB::beginTransaction();

        try {
            $total = 0;

            foreach ($request->detalles as $detalle) {
                $stock = Stock::find($detalle['stocks_id']);

                if (!$stock) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stock no encontrado'
                    ], 404);
                }

                if ($stock->cantidad < $detalle['cantidad']) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Stock insuficiente para el producto: ' . optional($stock->producto)->nombre,
                        'stock_disponible' => $stock->cantidad
                    ], 409);
                }

                $total += $detalle['cantidad'] * $detalle['precio_unitario'];
            }

            $venta = Venta::create([
                'clientes_id' => $request->clientes_id,
                'usuarios_id' => $request->usuarios_id,
                'fecha' => $request->fecha,
                'total' => $total,
                'metodo_pago' => trim($request->metodo_pago),
                'estado' => $request->estado ?? 'pagado',
            ]);

            foreach ($request->detalles as $detalle) {
                $subtotal = $detalle['cantidad'] * $detalle['precio_unitario'];

                $venta->detalles()->create([
                    'stocks_id' => $detalle['stocks_id'],
                    'cantidad' => $detalle['cantidad'],
                    'precio_unitario' => $detalle['precio_unitario'],
                    'subtotal' => $subtotal,
                ]);

                $stock = Stock::find($detalle['stocks_id']);
                $stock->decrement('cantidad', $detalle['cantidad']);
            }

            if ($request->has('comprobante')) {
                Comprobante::create([
                    'ventas_id' => $venta->id,
                    'tipo' => $request->comprobante['tipo'] ?? 'boleta',
                    'numero' => $request->comprobante['numero'] ?? 'V-' . str_pad($venta->id, 6, '0', STR_PAD_LEFT),
                    'fecha' => $request->fecha,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta registrada correctamente',
                'data' => $venta->load([
                    'cliente.persona',
                    'usuario.persona',
                    'detalles.stock.producto',
                    'comprobante'
                ])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al registrar la venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $venta = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'comprobante'
        ])->find($id);

        if (!$venta) {
            return response()->json([
                'success' => false,
                'message' => 'Venta no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Venta encontrada correctamente',
            'data' => $venta
        ], 200);
    }

    public function destroy($id)
    {
        $venta = Venta::with('detalles')->find($id);

        if (!$venta) {
            return response()->json([
                'success' => false,
                'message' => 'Venta no encontrada'
            ], 404);
        }

        DB::beginTransaction();

        try {
            foreach ($venta->detalles as $detalle) {
                $stock = Stock::find($detalle->stocks_id);

                if ($stock) {
                    $stock->increment('cantidad', $detalle->cantidad);
                }
            }

            $venta->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Venta eliminada correctamente y stock restaurado'
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Error al eliminar la venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}