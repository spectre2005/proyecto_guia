<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UsuarioController extends Controller
{
    /**
     * Listar usuarios.
     */
    public function index()
    {
        $usuarios = Usuario::with(['persona', 'role'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de usuarios obtenida correctamente',
            'data' => $usuarios
        ], 200);
    }

    /**
     * Registrar usuario.
     */
    public function store(Request $request)
    {
        $request->validate([
            'personas_id' => [
                'required',
                'exists:personas,id'
            ],

            'roles_id' => [
                'required',
                'exists:roles,id'
            ],

            'username' => [
                'required',
                'string',
                'min:4',
                'max:100',
                'unique:usuarios,username'
            ],

            'password' => [
                'required',
                'string',
                'min:8',
                'max:100'
            ],

            'estado' => [
                'nullable',
                'boolean'
            ]

        ], [

            'personas_id.required' => 'La persona es obligatoria.',
            'personas_id.exists' => 'La persona seleccionada no existe.',

            'roles_id.required' => 'El rol es obligatorio.',
            'roles_id.exists' => 'El rol seleccionado no existe.',

            'username.required' => 'El nombre de usuario es obligatorio.',
            'username.string' => 'El nombre de usuario debe ser texto.',
            'username.min' => 'El nombre de usuario debe tener mínimo 4 caracteres.',
            'username.max' => 'El nombre de usuario no debe superar los 100 caracteres.',
            'username.unique' => 'Este nombre de usuario ya existe.',

            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener mínimo 8 caracteres.',
            'password.max' => 'La contraseña no debe superar los 100 caracteres.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        $usuario = Usuario::create([
            'personas_id' => $request->personas_id,
            'roles_id' => $request->roles_id,
            'username' => trim($request->username),
            'password' => Hash::make($request->password),
            'estado' => $request->estado ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Usuario registrado correctamente',
            'data' => $usuario->load(['persona', 'role'])
        ], 201);
    }

    /**
     * Mostrar usuario.
     */
    public function show($id)
    {
        $usuario = Usuario::with([
            'persona',
            'role',
            'compras',
            'ventas',
            'carritos'
        ])->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Usuario encontrado correctamente',
            'data' => $usuario
        ], 200);
    }

    /**
     * Actualizar usuario.
     */
    public function update(Request $request, $id)
    {
        $usuario = Usuario::find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        $request->validate([

            'personas_id' => [
                'required',
                'exists:personas,id'
            ],

            'roles_id' => [
                'required',
                'exists:roles,id'
            ],

            'username' => [
                'required',
                'string',
                'min:4',
                'max:100',
                Rule::unique('usuarios', 'username')->ignore($usuario->id)
            ],

            'password' => [
                'nullable',
                'string',
                'min:8',
                'max:100'
            ],

            'estado' => [
                'nullable',
                'boolean'
            ]

        ], [

            'personas_id.required' => 'La persona es obligatoria.',
            'personas_id.exists' => 'La persona seleccionada no existe.',

            'roles_id.required' => 'El rol es obligatorio.',
            'roles_id.exists' => 'El rol seleccionado no existe.',

            'username.required' => 'El nombre de usuario es obligatorio.',
            'username.string' => 'El nombre de usuario debe ser texto.',
            'username.min' => 'El nombre de usuario debe tener mínimo 4 caracteres.',
            'username.max' => 'El nombre de usuario no debe superar los 100 caracteres.',
            'username.unique' => 'Este nombre de usuario ya existe.',

            'password.min' => 'La contraseña debe tener mínimo 8 caracteres.',
            'password.max' => 'La contraseña no debe superar los 100 caracteres.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        $datos = [
            'personas_id' => $request->personas_id,
            'roles_id' => $request->roles_id,
            'username' => trim($request->username),
            'estado' => $request->estado ?? true,
        ];

        if ($request->filled('password')) {
            $datos['password'] = Hash::make($request->password);
        }

        $usuario->update($datos);

        return response()->json([
            'success' => true,
            'message' => 'Usuario actualizado correctamente',
            'data' => $usuario->load(['persona', 'role'])
        ], 200);
    }

    /**
     * Eliminar usuario.
     */
    public function destroy($id)
    {
        $usuario = Usuario::with([
            'compras',
            'ventas',
            'carritos',
            'reportes',
            'auditorias'
        ])->find($id);

        if (!$usuario) {
            return response()->json([
                'success' => false,
                'message' => 'Usuario no encontrado'
            ], 404);
        }

        if (
            $usuario->compras->count() > 0 ||
            $usuario->ventas->count() > 0 ||
            $usuario->carritos->count() > 0 ||
            $usuario->reportes->count() > 0 ||
            $usuario->auditorias->count() > 0
        ) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el usuario porque tiene registros asociados'
            ], 409);
        }

        $usuario->delete();

        return response()->json([
            'success' => true,
            'message' => 'Usuario eliminado correctamente'
        ], 200);
    }
}