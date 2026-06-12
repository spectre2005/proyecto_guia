<?php

namespace App\Http\Controllers;

use App\Models\Comprobante;
use App\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;

class ComprobanteController extends Controller
{
    /**
     * Listar todos los comprobantes.
     */
    public function index(Request $request)
    {
        $usuario = $request->user()->loadMissing('role');
        $comprobantes = Comprobante::with([
            'venta.cliente.persona',
            'venta.usuario.persona',
            'venta.detalles.stock.producto'
        ])
            ->when(
                $usuario->role?->nombre === 'Vendedor',
                fn ($query) => $query->whereHas(
                    'venta',
                    fn ($ventaQuery) => $ventaQuery
                        ->where('usuarios_id', $usuario->id)
                )
            )
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de comprobantes obtenida correctamente',
            'data' => $comprobantes
        ], 200);
    }

    /**
     * Registrar un comprobante.
     */
    public function store(Request $request)
    {
        $request->validate([
            'ventas_id' => [
                'required',
                'exists:ventas,id',
                'unique:comprobantes,ventas_id'
            ],
            'tipo' => [
                'required',
                'string',
                'max:50',
                Rule::in(['boleta', 'factura', 'ticket'])
            ],
            'numero' => [
                'nullable',
                'string',
                'max:50',
                'unique:comprobantes,numero'
            ],
            'fecha' => [
                'required',
                'date'
            ],
        ], [
            'ventas_id.required' => 'La venta es obligatoria.',
            'ventas_id.exists' => 'La venta seleccionada no existe.',
            'ventas_id.unique' => 'Esta venta ya tiene un comprobante registrado.',

            'tipo.required' => 'El tipo de comprobante es obligatorio.',
            'tipo.in' => 'El tipo de comprobante debe ser boleta, factura o ticket.',

            'numero.unique' => 'Este número de comprobante ya está registrado.',
            'numero.max' => 'El número no debe superar los 50 caracteres.',

            'fecha.required' => 'La fecha es obligatoria.',
            'fecha.date' => 'La fecha no es válida.',
        ]);

        $venta = Venta::findOrFail($request->ventas_id);

        if (
            $request->user()->role?->nombre === 'Vendedor'
            && $venta->usuarios_id !== $request->user()->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para generar este comprobante.'
            ], 403);
        }

        $numero = $request->numero;

        if (!$numero) {
            $prefijo = match ($request->tipo) {
                'factura' => 'F',
                'ticket' => 'T',
                default => 'B',
            };

            $ultimoId = Comprobante::max('id') + 1;
            $numero = $prefijo . '-' . str_pad($ultimoId, 6, '0', STR_PAD_LEFT);
        }

        $comprobante = Comprobante::create([
            'ventas_id' => $request->ventas_id,
            'tipo' => strtolower(trim($request->tipo)),
            'numero' => $numero,
            'fecha' => Carbon::parse($request->fecha)
                ->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Comprobante registrado correctamente',
            'data' => $comprobante->load('venta')
        ], 201);
    }

    /**
     * Mostrar un comprobante específico.
     */
    public function show(Request $request, $id)
    {
        $comprobante = Comprobante::with([
            'venta.cliente.persona',
            'venta.usuario.persona',
            'venta.detalles.stock.producto',
            'venta.detalles.stock.talla',
            'venta.detalles.stock.color'
        ])->find($id);

        if (!$comprobante) {
            return response()->json([
                'success' => false,
                'message' => 'Comprobante no encontrado'
            ], 404);
        }

        if (
            $request->user()->role?->nombre === 'Vendedor'
            && $comprobante->venta?->usuarios_id !== $request->user()->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para ver este comprobante.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Comprobante encontrado correctamente',
            'data' => $comprobante
        ], 200);
    }

    /**
     * Actualizar comprobante.
     */
    public function update(Request $request, $id)
    {
        $comprobante = Comprobante::find($id);

        if (!$comprobante) {
            return response()->json([
                'success' => false,
                'message' => 'Comprobante no encontrado'
            ], 404);
        }

        $request->validate([
            'ventas_id' => [
                'required',
                'exists:ventas,id',
                Rule::unique('comprobantes', 'ventas_id')->ignore($comprobante->id)
            ],
            'tipo' => [
                'required',
                'string',
                'max:50',
                Rule::in(['boleta', 'factura', 'ticket'])
            ],
            'numero' => [
                'required',
                'string',
                'max:50',
                Rule::unique('comprobantes', 'numero')->ignore($comprobante->id)
            ],
            'fecha' => [
                'required',
                'date'
            ],
        ]);

        $comprobante->update([
            'ventas_id' => $request->ventas_id,
            'tipo' => strtolower(trim($request->tipo)),
            'numero' => trim($request->numero),
            'fecha' => $request->fecha,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Comprobante actualizado correctamente',
            'data' => $comprobante->load('venta')
        ], 200);
    }

    /**
     * Eliminar comprobante.
     */
    public function destroy($id)
    {
        $comprobante = Comprobante::find($id);

        if (!$comprobante) {
            return response()->json([
                'success' => false,
                'message' => 'Comprobante no encontrado'
            ], 404);
        }

        $comprobante->delete();

        return response()->json([
            'success' => true,
            'message' => 'Comprobante eliminado correctamente'
        ], 200);
    }

    /**
     * Buscar comprobante por número.
     */
    public function buscarPorNumero(Request $request, $numero)
    {
        $comprobante = Comprobante::with([
            'venta.cliente.persona',
            'venta.usuario.persona',
            'venta.detalles.stock.producto'
        ])
        ->where('numero', $numero)
        ->first();

        if (!$comprobante) {
            return response()->json([
                'success' => false,
                'message' => 'No se encontró ningún comprobante con ese número'
            ], 404);
        }

        if (
            $request->user()->role?->nombre === 'Vendedor'
            && $comprobante->venta?->usuarios_id !== $request->user()->id
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para ver este comprobante.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Comprobante encontrado correctamente',
            'data' => $comprobante
        ], 200);
    }
}
