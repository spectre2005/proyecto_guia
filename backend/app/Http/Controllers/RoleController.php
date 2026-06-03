<?php

namespace App\Http\Controllers;

use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    /**
     * Listar todos los roles.
     */
    public function index()
    {
        $roles = Role::orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de roles obtenida correctamente',
            'data' => $roles
        ], 200);
    }

    /**
     * Registrar un nuevo rol.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:50',
                'unique:roles,nombre'
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],
        ], [
            'nombre.required' => 'El nombre del rol es obligatorio.',
            'nombre.string' => 'El nombre del rol debe ser texto.',
            'nombre.max' => 'El nombre del rol no debe superar los 50 caracteres.',
            'nombre.unique' => 'Este rol ya se encuentra registrado.',
            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $role = Role::create([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rol registrado correctamente',
            'data' => $role
        ], 201);
    }

    /**
     * Mostrar un rol específico.
     */
    public function show($id)
    {
        $role = Role::with('usuarios')->find($id);

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rol encontrado correctamente',
            'data' => $role
        ], 200);
    }

    /**
     * Actualizar un rol.
     */
    public function update(Request $request, $id)
    {
        $role = Role::find($id);

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'nombre')->ignore($role->id)
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255'
            ],
        ], [
            'nombre.required' => 'El nombre del rol es obligatorio.',
            'nombre.string' => 'El nombre del rol debe ser texto.',
            'nombre.max' => 'El nombre del rol no debe superar los 50 caracteres.',
            'nombre.unique' => 'Este rol ya se encuentra registrado.',
            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 255 caracteres.',
        ]);

        $role->update([
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Rol actualizado correctamente',
            'data' => $role
        ], 200);
    }

    /**
     * Eliminar un rol.
     */
    public function destroy($id)
    {
        $role = Role::withCount('usuarios')->find($id);

        if (!$role) {
            return response()->json([
                'success' => false,
                'message' => 'Rol no encontrado'
            ], 404);
        }

        if ($role->usuarios_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el rol porque tiene usuarios asignados'
            ], 409);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Rol eliminado correctamente'
        ], 200);
    }
}