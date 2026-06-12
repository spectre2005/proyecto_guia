<?php

namespace App\Http\Controllers;

use App\Models\Color;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ColorController extends Controller
{
    /**
     * Listar todos los colores.
     */
    public function index()
    {
        $colores = Color::withCount('stocks')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de colores obtenida correctamente',
            'data' => $colores
        ], 200);
    }

    /**
     * Registrar un nuevo color.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:50',
                'unique:colores,nombre'
            ],

            'codigo_hex' => [
                'nullable',
                'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
                'unique:colores,codigo_hex'
            ],

        ], [

            'nombre.required' => 'El nombre del color es obligatorio.',
            'nombre.string' => 'El nombre del color debe ser texto.',
            'nombre.max' => 'El nombre del color no debe superar los 50 caracteres.',
            'nombre.unique' => 'Este color ya se encuentra registrado.',

            'codigo_hex.regex' => 'El código HEX no es válido.',
            'codigo_hex.unique' => 'Este código HEX ya se encuentra registrado.',
        ]);

        $color = Color::create([
            'nombre' => ucfirst(strtolower(trim($request->nombre))),
            'codigo_hex' => $request->codigo_hex
                ? strtoupper(trim($request->codigo_hex))
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Color registrado correctamente',
            'data' => $color
        ], 201);
    }

    /**
     * Mostrar un color específico.
     */
    public function show($id)
    {
        $color = Color::with('stocks.producto')->find($id);

        if (!$color) {
            return response()->json([
                'success' => false,
                'message' => 'Color no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Color encontrado correctamente',
            'data' => $color
        ], 200);
    }

    /**
     * Actualizar un color.
     */
    public function update(Request $request, $id)
    {
        $color = Color::find($id);

        if (!$color) {
            return response()->json([
                'success' => false,
                'message' => 'Color no encontrado'
            ], 404);
        }

        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:50',
                Rule::unique('colores', 'nombre')->ignore($color->id)
            ],

            'codigo_hex' => [
                'nullable',
                'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/',
                Rule::unique('colores', 'codigo_hex')->ignore($color->id)
            ],

        ], [

            'nombre.required' => 'El nombre del color es obligatorio.',
            'nombre.string' => 'El nombre del color debe ser texto.',
            'nombre.max' => 'El nombre del color no debe superar los 50 caracteres.',
            'nombre.unique' => 'Este color ya se encuentra registrado.',

            'codigo_hex.regex' => 'El código HEX no es válido.',
            'codigo_hex.unique' => 'Este código HEX ya se encuentra registrado.',
        ]);

        $color->update([
            'nombre' => ucfirst(strtolower(trim($request->nombre))),
            'codigo_hex' => $request->codigo_hex
                ? strtoupper(trim($request->codigo_hex))
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Color actualizado correctamente',
            'data' => $color
        ], 200);
    }

    /**
     * Eliminar un color.
     */
    public function destroy($id)
    {
        $color = Color::withCount('stocks')->find($id);

        if (!$color) {
            return response()->json([
                'success' => false,
                'message' => 'Color no encontrado'
            ], 404);
        }

        if ($color->stocks_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el color porque está asociado a productos en stock'
            ], 409);
        }

        $color->delete();

        return response()->json([
            'success' => true,
            'message' => 'Color eliminado correctamente'
        ], 200);
    }
}