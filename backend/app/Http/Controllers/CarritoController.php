<?php

namespace App\Http\Controllers;

use App\Models\Carrito;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CarritoController extends Controller
{
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