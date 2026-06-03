<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoriaController extends Controller
{
    /**
     * Listar todas las categorías.
     */
    public function index()
    {
        $categorias = Categoria::withCount('productos')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de categorías obtenida correctamente',
            'data' => $categorias
        ], 200);
    }

    /**
     * Registrar una nueva categoría.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                'unique:categorias,nombre'
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],
        ], [
            'nombre.required' => 'El nombre de la categoría es obligatorio.',
            'nombre.string' => 'El nombre de la categoría debe ser texto.',
            'nombre.max' => 'El nombre de la categoría no debe superar los 100 caracteres.',
            'nombre.unique' => 'Esta categoría ya se encuentra registrada.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $categoria = Categoria::create([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Categoría registrada correctamente',
            'data' => $categoria
        ], 201);
    }

    /**
     * Mostrar una categoría específica.
     */
    public function show($id)
    {
        $categoria = Categoria::with('productos')->find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Categoría encontrada correctamente',
            'data' => $categoria
        ], 200);
    }

    /**
     * Actualizar una categoría.
     */
    public function update(Request $request, $id)
    {
        $categoria = Categoria::find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada'
            ], 404);
        }

        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categorias', 'nombre')->ignore($categoria->id)
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],
        ], [
            'nombre.required' => 'El nombre de la categoría es obligatorio.',
            'nombre.string' => 'El nombre de la categoría debe ser texto.',
            'nombre.max' => 'El nombre de la categoría no debe superar los 100 caracteres.',
            'nombre.unique' => 'Esta categoría ya se encuentra registrada.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $categoria->update([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Categoría actualizada correctamente',
            'data' => $categoria
        ], 200);
    }

    /**
     * Eliminar una categoría.
     */
    public function destroy($id)
    {
        $categoria = Categoria::withCount('productos')->find($id);

        if (!$categoria) {
            return response()->json([
                'success' => false,
                'message' => 'Categoría no encontrada'
            ], 404);
        }

        if ($categoria->productos_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la categoría porque tiene productos registrados'
            ], 409);
        }

        $categoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'Categoría eliminada correctamente'
        ], 200);
    }
}