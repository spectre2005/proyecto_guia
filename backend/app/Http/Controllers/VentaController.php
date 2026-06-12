<?php

namespace App\Http\Controllers;

use App\Models\Venta;
use App\Models\Stock;
use App\Models\Comprobante;
use App\Models\Carrito;
use App\Models\CarritoDetalle;
use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class VentaController extends Controller
{
    public function finalizarMiCompra(Request $request)
    {
        $datos = $request->validate([
            'metodo_pago' => 'required|in:yape,tarjeta',
            'referencia_pago' => 'required|digits_between:3,4',
        ], [
            'metodo_pago.required' => 'Selecciona un medio de pago.',
            'metodo_pago.in' => 'El medio de pago seleccionado no es válido.',
            'referencia_pago.required' => 'Falta la referencia del medio de pago.',
            'referencia_pago.digits_between' => 'La referencia del pago no es válida.',
        ]);

        $longitudEsperada = $datos['metodo_pago'] === 'yape' ? 3 : 4;

        if (strlen($datos['referencia_pago']) !== $longitudEsperada) {
            return response()->json([
                'success' => false,
                'message' => 'La referencia del medio de pago no es válida.',
            ], 422);
        }

        $usuario = $request->user()->load('persona');

        if (!$usuario->persona?->direccion) {
            return response()->json([
                'success' => false,
                'message' => 'Agrega una dirección en tu perfil antes de comprar.',
            ], 422);
        }

        DB::beginTransaction();

        try {
            $carrito = Carrito::where('usuarios_id', $usuario->id)
                ->where('estado', false)
                ->lockForUpdate()
                ->first();

            if (!$carrito) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'No tienes un carrito activo.',
                ], 409);
            }

            $detallesCarrito = CarritoDetalle::where(
                'carrito_id',
                $carrito->id
            )->lockForUpdate()->get();

            if ($detallesCarrito->isEmpty()) {
                DB::rollBack();

                return response()->json([
                    'success' => false,
                    'message' => 'Tu carrito está vacío.',
                ], 409);
            }

            $items = [];
            $total = 0;

            foreach ($detallesCarrito as $detalleCarrito) {
                $stock = Stock::with('producto')
                    ->lockForUpdate()
                    ->find($detalleCarrito->stocks_id);

                if (!$stock || $stock->cantidad < $detalleCarrito->cantidad) {
                    DB::rollBack();

                    return response()->json([
                        'success' => false,
                        'message' => $stock
                            ? 'Stock insuficiente para ' .
                                ($stock->producto?->nombre ?? 'un producto') . '.'
                            : 'Uno de los productos ya no está disponible.',
                    ], 409);
                }

                $precio = (float) $stock->precio;
                $subtotal = $precio * $detalleCarrito->cantidad;
                $total += $subtotal;
                $items[] = [
                    'stock' => $stock,
                    'cantidad' => $detalleCarrito->cantidad,
                    'precio' => $precio,
                    'subtotal' => $subtotal,
                ];
            }

            $etiquetaPago = $datos['metodo_pago'] === 'yape'
                ? 'Yape terminado en ' . $datos['referencia_pago']
                : 'Tarjeta terminada en ' . $datos['referencia_pago'];

            $cliente = Cliente::firstOrCreate([
                'personas_id' => $usuario->personas_id,
            ]);

            $venta = Venta::create([
                'clientes_id' => $cliente->id,
                'usuarios_id' => $usuario->id,
                'fecha' => now(),
                'total' => $total,
                'metodo_pago' => $etiquetaPago,
                'estado' => 'pagado',
            ]);

            foreach ($items as $item) {
                $venta->detalles()->create([
                    'stocks_id' => $item['stock']->id,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $item['precio'],
                    'subtotal' => $item['subtotal'],
                ]);

                $actualizados = Stock::where('id', $item['stock']->id)
                    ->where('cantidad', '>=', $item['cantidad'])
                    ->decrement('cantidad', $item['cantidad']);

                if ($actualizados !== 1) {
                    throw new \RuntimeException(
                        'El stock cambió mientras se procesaba la compra.'
                    );
                }
            }

            $carrito->update(['estado' => true]);

            DB::commit();

            $venta->load([
                'cliente.persona',
                'usuario.persona',
                'detalles.stock.producto',
                'detalles.stock.talla',
                'detalles.stock.color',
            ]);
            $venta->setAttribute(
                'fecha_estimada_entrega',
                now()->addDays(3)->toDateString()
            );

            return response()->json([
                'success' => true,
                'message' => 'Pago completado y venta registrada correctamente.',
                'data' => $venta,
            ], 201);
        } catch (\Throwable $error) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'No se pudo completar la compra.',
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function miCompra(Request $request, Venta $venta)
    {
        if ($venta->usuarios_id !== $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para ver esta compra.',
            ], 403);
        }

        $venta->load([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
        ]);
        $venta->setAttribute(
            'fecha_estimada_entrega',
            $venta->fecha
                ? \Illuminate\Support\Carbon::parse($venta->fecha)
                    ->addDays(3)
                    ->toDateString()
                : now()->addDays(3)->toDateString()
        );

        return response()->json([
            'success' => true,
            'data' => $venta,
        ]);
    }

    public function index(Request $request)
    {
        $usuario = $request->user()->loadMissing('role');
        $ventas = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'comprobante'
        ])
            ->when(
                $usuario->role?->nombre === 'Vendedor',
                fn ($query) => $query->where('usuarios_id', $usuario->id)
            )
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
        $usuarioAutenticado = $request->user();
        $datos = $request->validate([
            'clientes_id' => [
                'nullable',
                'exists:clientes,id',
            ],
            'usuarios_id' => 'required|exists:usuarios,id',
            'fecha' => 'required|date',
            'metodo_pago' => [
                'required',
                Rule::in(['efectivo', 'yape', 'tarjeta', 'transferencia']),
            ],
            'monto_recibido' => 'nullable|numeric|min:0',

            'detalles' => 'required|array|min:1',
            'detalles.*.stocks_id' => 'required|exists:stocks,id',
            'detalles.*.cantidad' => 'required|integer|min:1',

            'comprobante.tipo' => [
                'required',
                Rule::in(['boleta', 'ticket']),
            ],
        ], [
            'usuarios_id.required' => 'El usuario vendedor es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',
            'clientes_id.exists' => 'El cliente seleccionado no existe.',
            'fecha.required' => 'La fecha de venta es obligatoria.',
            'fecha.date' => 'La fecha no es válida.',
            'metodo_pago.required' => 'El método de pago es obligatorio.',
            'metodo_pago.in' => 'Selecciona un método de pago válido.',
            'detalles.required' => 'Debe agregar al menos un producto a la venta.',
            'detalles.array' => 'Los detalles deben enviarse como arreglo.',
            'detalles.min' => 'Debe agregar al menos un producto.',
            'detalles.*.stocks_id.required' => 'El stock del producto es obligatorio.',
            'detalles.*.stocks_id.exists' => 'El stock seleccionado no existe.',
            'detalles.*.cantidad.required' => 'La cantidad es obligatoria.',
            'detalles.*.cantidad.integer' => 'La cantidad debe ser un número entero.',
            'detalles.*.cantidad.min' => 'La cantidad debe ser mayor a 0.',
            'comprobante.tipo.required' => 'Selecciona el tipo de comprobante.',
        ]);
        $datos['usuarios_id'] = $usuarioAutenticado->id;

        try {
            $venta = DB::transaction(function () use ($datos) {
                $items = [];
                $total = 0;
                $fechaVenta = Carbon::parse($datos['fecha'])
                    ->format('Y-m-d H:i:s');

                foreach ($datos['detalles'] as $detalle) {
                    $stock = Stock::with('producto')
                        ->lockForUpdate()
                        ->find($detalle['stocks_id']);

                    if (!$stock || $stock->cantidad < $detalle['cantidad']) {
                        abort(
                            409,
                            $stock
                                ? 'Stock insuficiente para ' .
                                    ($stock->producto?->nombre ?? 'el producto') .
                                    '. Disponible: ' . $stock->cantidad
                                : 'Una variante seleccionada ya no existe.'
                        );
                    }

                    $precio = (float) $stock->precio;
                    $subtotal = $precio * $detalle['cantidad'];
                    $total += $subtotal;
                    $items[] = [
                        'stock' => $stock,
                        'cantidad' => $detalle['cantidad'],
                        'precio' => $precio,
                        'subtotal' => $subtotal,
                    ];
                }

                $esEfectivo = $datos['metodo_pago'] === 'efectivo';
                $montoRecibido = $esEfectivo
                    ? (float) ($datos['monto_recibido'] ?? 0)
                    : $total;

                if ($esEfectivo && $montoRecibido < $total) {
                    abort(422, 'El efectivo recibido no cubre el total de la venta.');
                }

                $venta = Venta::create([
                    'clientes_id' => $datos['clientes_id'] ?? null,
                    'usuarios_id' => $datos['usuarios_id'],
                    'fecha' => $fechaVenta,
                    'total' => $total,
                    'metodo_pago' => $datos['metodo_pago'],
                    'monto_recibido' => $montoRecibido,
                    'vuelto' => max(0, $montoRecibido - $total),
                    'estado' => 'pagado',
                ]);

                foreach ($items as $item) {
                    $venta->detalles()->create([
                        'stocks_id' => $item['stock']->id,
                        'cantidad' => $item['cantidad'],
                        'precio_unitario' => $item['precio'],
                        'subtotal' => $item['subtotal'],
                    ]);

                    $item['stock']->decrement('cantidad', $item['cantidad']);
                }

                $prefijo = match ($datos['comprobante']['tipo']) {
                    'ticket' => 'T001',
                    default => 'B001',
                };

                Comprobante::create([
                    'ventas_id' => $venta->id,
                    'tipo' => $datos['comprobante']['tipo'],
                    'numero' => $prefijo . '-' .
                        str_pad($venta->id, 8, '0', STR_PAD_LEFT),
                    'fecha' => $fechaVenta,
                ]);

                return $venta;
            });

            return response()->json([
                'success' => true,
                'message' => 'Venta registrada correctamente',
                'data' => $venta->load([
                    'cliente.persona',
                    'usuario.persona',
                    'detalles.stock.producto',
                    'detalles.stock.talla',
                    'detalles.stock.color',
                    'comprobante'
                ])
            ], 201);

        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar la venta',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(Request $request, $id)
    {
        $venta = Venta::with([
            'cliente.persona',
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
            'comprobante'
        ])->find($id);

        if (!$venta) {
            return response()->json([
                'success' => false,
                'message' => 'Venta no encontrada'
            ], 404);
        }

        if (
            $request->user()->role?->nombre === 'Vendedor'
            && $venta->usuarios_id !== $request->user()->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para ver esta venta.'
            ], 403);
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
