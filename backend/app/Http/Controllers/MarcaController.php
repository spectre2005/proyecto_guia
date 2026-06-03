<?php

namespace App\Http\Controllers;

use App\Models\Marca;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MarcaController extends Controller
{
    /**
     * Listar todas las marcas.
     */
    public function index()
    {
        $marcas = Marca::withCount('productos')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de marcas obtenida correctamente',
            'data' => $marcas
        ], 200);
    }

    /**
     * Registrar una nueva marca.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                'unique:marcas,nombre'
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],

        ], [

            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.string' => 'El nombre de la marca debe ser texto.',
            'nombre.max' => 'El nombre de la marca no debe superar los 100 caracteres.',
            'nombre.unique' => 'Esta marca ya se encuentra registrada.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $marca = Marca::create([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion
                ? trim($request->descripcion)
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Marca registrada correctamente',
            'data' => $marca
        ], 201);
    }

    /**
     * Mostrar una marca específica.
     */
    public function show($id)
    {
        $marca = Marca::with('productos')->find($id);

        if (!$marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Marca encontrada correctamente',
            'data' => $marca
        ], 200);
    }

    /**
     * Actualizar una marca.
     */
    public function update(Request $request, $id)
    {
        $marca = Marca::find($id);

        if (!$marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada'
            ], 404);
        }

        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('marcas', 'nombre')->ignore($marca->id)
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],

        ], [

            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.string' => 'El nombre de la marca debe ser texto.',
            'nombre.max' => 'El nombre de la marca no debe superar los 100 caracteres.',
            'nombre.unique' => 'Esta marca ya se encuentra registrada.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $marca->update([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion
                ? trim($request->descripcion)
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Marca actualizada correctamente',
            'data' => $marca
        ], 200);
    }

    /**
     * Eliminar una marca.
     */
    public function destroy($id)
    {
        $marca = Marca::withCount('productos')->find($id);

        if (!$marca) {
            return response()->json([
                'success' => false,
                'message' => 'Marca no encontrada'
            ], 404);
        }

        if ($marca->productos_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la marca porque tiene productos asociados'
            ], 409);
        }

        $marca->delete();

        return response()->json([
            'success' => true,
            'message' => 'Marca eliminada correctamente'
        ], 200);
    }
}