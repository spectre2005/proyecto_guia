<?php

namespace App\Http\Controllers;

use App\Models\Materiale;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MaterialeController extends Controller
{
    public function index()
    {
        $materiales = Materiale::withCount('productos')
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de materiales obtenida correctamente',
            'data' => $materiales,
        ]);
    }

    public function store(Request $request)
    {
        $datos = $request->validate([
            'nombre' => ['required', 'string', 'max:100', 'unique:materiales,nombre'],
        ], [
            'nombre.required' => 'El nombre del material es obligatorio.',
            'nombre.unique' => 'Este material ya se encuentra registrado.',
        ]);

        $material = Materiale::create([
            'nombre' => trim($datos['nombre']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material registrado correctamente',
            'data' => $material,
        ], 201);
    }

    public function show($id)
    {
        $material = Materiale::with('productos')->find($id);

        if (!$material) {
            return response()->json([
                'success' => false,
                'message' => 'Material no encontrado',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Material encontrado correctamente',
            'data' => $material,
        ]);
    }

    public function update(Request $request, $id)
    {
        $material = Materiale::find($id);

        if (!$material) {
            return response()->json([
                'success' => false,
                'message' => 'Material no encontrado',
            ], 404);
        }

        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('materiales', 'nombre')->ignore($material->id),
            ],
        ], [
            'nombre.required' => 'El nombre del material es obligatorio.',
            'nombre.unique' => 'Este material ya se encuentra registrado.',
        ]);

        $material->update([
            'nombre' => trim($datos['nombre']),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Material actualizado correctamente',
            'data' => $material,
        ]);
    }

    public function destroy($id)
    {
        $material = Materiale::withCount('productos')->find($id);

        if (!$material) {
            return response()->json([
                'success' => false,
                'message' => 'Material no encontrado',
            ], 404);
        }

        if ($material->productos_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el material porque tiene productos asociados',
            ], 409);
        }

        $material->delete();

        return response()->json([
            'success' => true,
            'message' => 'Material eliminado correctamente',
        ]);
    }
}
