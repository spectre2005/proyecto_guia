<?php

namespace App\Http\Controllers;

use App\Models\Talla;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TallaController extends Controller
{
    /**
     * Listar todas las tallas.
     */
    public function index()
    {
        $tallas = Talla::withCount('stocks')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de tallas obtenida correctamente',
            'data' => $tallas
        ], 200);
    }

    /**
     * Registrar una nueva talla.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:20',
                'unique:tallas,nombre'
            ],
        ], [
            'nombre.required' => 'El nombre de la talla es obligatorio.',
            'nombre.string' => 'El nombre de la talla debe ser texto.',
            'nombre.max' => 'El nombre de la talla no debe superar los 20 caracteres.',
            'nombre.unique' => 'Esta talla ya se encuentra registrada.',
        ]);

        $talla = Talla::create([
            'nombre' => strtoupper(trim($request->nombre)),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Talla registrada correctamente',
            'data' => $talla
        ], 201);
    }

    /**
     * Mostrar una talla específica.
     */
    public function show($id)
    {
        $talla = Talla::with('stocks.producto')->find($id);

        if (!$talla) {
            return response()->json([
                'success' => false,
                'message' => 'Talla no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Talla encontrada correctamente',
            'data' => $talla
        ], 200);
    }

    /**
     * Actualizar una talla.
     */
    public function update(Request $request, $id)
    {
        $talla = Talla::find($id);

        if (!$talla) {
            return response()->json([
                'success' => false,
                'message' => 'Talla no encontrada'
            ], 404);
        }

        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:20',
                Rule::unique('tallas', 'nombre')->ignore($talla->id)
            ],
        ], [
            'nombre.required' => 'El nombre de la talla es obligatorio.',
            'nombre.string' => 'El nombre de la talla debe ser texto.',
            'nombre.max' => 'El nombre de la talla no debe superar los 20 caracteres.',
            'nombre.unique' => 'Esta talla ya se encuentra registrada.',
        ]);

        $talla->update([
            'nombre' => strtoupper(trim($request->nombre)),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Talla actualizada correctamente',
            'data' => $talla
        ], 200);
    }

    /**
     * Eliminar una talla.
     */
    public function destroy($id)
    {
        $talla = Talla::withCount('stocks')->find($id);

        if (!$talla) {
            return response()->json([
                'success' => false,
                'message' => 'Talla no encontrada'
            ], 404);
        }

        if ($talla->stocks_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la talla porque está asociada a productos en stock'
            ], 409);
        }

        $talla->delete();

        return response()->json([
            'success' => true,
            'message' => 'Talla eliminada correctamente'
        ], 200);
    }
}