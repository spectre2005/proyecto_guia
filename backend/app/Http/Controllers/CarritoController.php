<?php

namespace App\Http\Controllers;

use App\Models\Carrito;
use App\Models\CarritoDetalle;
use App\Models\Stock;
use Illuminate\Http\Request;

class CarritoController extends Controller
{
    private function cargarCarrito(Carrito $carrito): Carrito
    {
        return $carrito->load([
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color',
        ]);
    }

    private function carritoActivoDelUsuario(Request $request): Carrito
    {
        return Carrito::firstOrCreate([
            'usuarios_id' => $request->user()->id,
            'estado' => false,
        ]);
    }

    public function miCarrito(Request $request)
    {
        $carrito = $this->cargarCarrito(
            $this->carritoActivoDelUsuario($request)
        );

        return response()->json([
            'success' => true,
            'message' => 'Carrito obtenido correctamente',
            'data' => $carrito,
        ]);
    }

    public function agregarAMiCarrito(Request $request)
    {
        $datos = $request->validate([
            'stocks_id' => 'required|exists:stocks,id',
            'cantidad' => 'required|integer|min:1',
        ]);

        $stock = Stock::with('producto')->findOrFail($datos['stocks_id']);
        $carrito = $this->carritoActivoDelUsuario($request);
        $detalle = CarritoDetalle::where('carrito_id', $carrito->id)
            ->where('stocks_id', $stock->id)
            ->first();
        $cantidadTotal = ($detalle?->cantidad ?? 0) + $datos['cantidad'];

        if ($cantidadTotal > $stock->cantidad) {
            return response()->json([
                'success' => false,
                'message' => 'La cantidad solicitada supera el stock disponible.',
                'stock_disponible' => $stock->cantidad,
            ], 409);
        }

        if ($detalle) {
            $detalle->update([
                'cantidad' => $cantidadTotal,
                'precio' => $stock->precio,
            ]);
        } else {
            CarritoDetalle::create([
                'carrito_id' => $carrito->id,
                'stocks_id' => $stock->id,
                'cantidad' => $datos['cantidad'],
                'precio' => $stock->precio,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Producto agregado al carrito.',
            'data' => $this->cargarCarrito($carrito),
        ]);
    }

    public function actualizarItemMiCarrito(
        Request $request,
        CarritoDetalle $detalle
    ) {
        $datos = $request->validate([
            'cantidad' => 'required|integer|min:1',
        ]);

        $detalle->load('carrito', 'stock.producto');

        if (
            $detalle->carrito->usuarios_id !== $request->user()->id ||
            $detalle->carrito->estado
        ) {
            return response()->json([
                'message' => 'No tienes permiso para modificar este producto.'
            ], 403);
        }

        if ($datos['cantidad'] > $detalle->stock->cantidad) {
            return response()->json([
                'message' => 'La cantidad solicitada supera el stock disponible.',
                'stock_disponible' => $detalle->stock->cantidad,
            ], 409);
        }

        $detalle->update([
            'cantidad' => $datos['cantidad'],
            'precio' => $detalle->stock->precio,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cantidad actualizada.',
            'data' => $this->cargarCarrito($detalle->carrito),
        ]);
    }

    public function eliminarItemMiCarrito(
        Request $request,
        CarritoDetalle $detalle
    ) {
        $detalle->load('carrito');

        if (
            $detalle->carrito->usuarios_id !== $request->user()->id ||
            $detalle->carrito->estado
        ) {
            return response()->json([
                'message' => 'No tienes permiso para eliminar este producto.'
            ], 403);
        }

        $carrito = $detalle->carrito;
        $detalle->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado del carrito.',
            'data' => $this->cargarCarrito($carrito),
        ]);
    }

    public function vaciarMiCarrito(Request $request)
    {
        $carrito = $this->carritoActivoDelUsuario($request);
        $carrito->detalles()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Carrito vaciado correctamente.',
            'data' => $this->cargarCarrito($carrito),
        ]);
    }

    /**
     * Listar todos los carritos.
     */
    public function index()
    {
        $carritos = Carrito::with([
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color'
        ])
        ->orderBy('id', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de carritos obtenida correctamente',
            'data' => $carritos
        ], 200);
    }

    /**
     * Crear un carrito para un usuario.
     */
    public function store(Request $request)
    {
        $request->validate([
            'usuarios_id' => [
                'required',
                'exists:usuarios,id'
            ],
            'estado' => [
                'nullable',
                'boolean'
            ],
        ], [
            'usuarios_id.required' => 'El usuario es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',
            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        $carritoActivo = Carrito::where('usuarios_id', $request->usuarios_id)
            ->where('estado', false)
            ->first();

        if ($carritoActivo) {
            return response()->json([
                'success' => false,
                'message' => 'Este usuario ya tiene un carrito activo',
                'data' => $carritoActivo->load('detalles.stock.producto')
            ], 409);
        }

        $carrito = Carrito::create([
            'usuarios_id' => $request->usuarios_id,
            'estado' => $request->estado ?? false,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Carrito creado correctamente',
            'data' => $carrito->load('usuario.persona')
        ], 201);
    }

    /**
     * Mostrar un carrito específico.
     */
    public function show($id)
    {
        $carrito = Carrito::with([
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color'
        ])->find($id);

        if (!$carrito) {
            return response()->json([
                'success' => false,
                'message' => 'Carrito no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Carrito encontrado correctamente',
            'data' => $carrito
        ], 200);
    }

    /**
     * Actualizar estado del carrito.
     */
    public function update(Request $request, $id)
    {
        $carrito = Carrito::find($id);

        if (!$carrito) {
            return response()->json([
                'success' => false,
                'message' => 'Carrito no encontrado'
            ], 404);
        }

        $request->validate([
            'usuarios_id' => [
                'required',
                'exists:usuarios,id'
            ],
            'estado' => [
                'required',
                'boolean'
            ],
        ], [
            'usuarios_id.required' => 'El usuario es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',
            'estado.required' => 'El estado es obligatorio.',
            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        if ($request->estado == false) {
            $carritoActivo = Carrito::where('usuarios_id', $request->usuarios_id)
                ->where('estado', false)
                ->where('id', '!=', $carrito->id)
                ->first();

            if ($carritoActivo) {
                return response()->json([
                    'success' => false,
                    'message' => 'Este usuario ya tiene otro carrito activo'
                ], 409);
            }
        }

        $carrito->update([
            'usuarios_id' => $request->usuarios_id,
            'estado' => $request->estado,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Carrito actualizado correctamente',
            'data' => $carrito->load([
                'usuario.persona',
                'detalles.stock.producto'
            ])
        ], 200);
    }

    /**
     * Eliminar carrito.
     */
    public function destroy($id)
    {
        $carrito = Carrito::withCount('detalles')->find($id);

        if (!$carrito) {
            return response()->json([
                'success' => false,
                'message' => 'Carrito no encontrado'
            ], 404);
        }

        if ($carrito->detalles_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el carrito porque tiene productos agregados'
            ], 409);
        }

        $carrito->delete();

        return response()->json([
            'success' => true,
            'message' => 'Carrito eliminado correctamente'
        ], 200);
    }

    /**
     * Ver carrito activo de un usuario.
     */
    public function carritoActivo($usuarios_id)
    {
        $carrito = Carrito::with([
            'usuario.persona',
            'detalles.stock.producto',
            'detalles.stock.talla',
            'detalles.stock.color'
        ])
        ->where('usuarios_id', $usuarios_id)
        ->where('estado', false)
        ->first();

        if (!$carrito) {
            return response()->json([
                'success' => false,
                'message' => 'El usuario no tiene carrito activo'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Carrito activo obtenido correctamente',
            'data' => $carrito
        ], 200);
    }

    /**
     * Vaciar carrito.
     */
    public function vaciar($id)
    {
        $carrito = Carrito::with('detalles')->find($id);

        if (!$carrito) {
            return response()->json([
                'success' => false,
                'message' => 'Carrito no encontrado'
            ], 404);
        }

        $carrito->detalles()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Carrito vaciado correctamente'
        ], 200);
    }
}
