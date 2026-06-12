<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\Persona;
use App\Models\Usuario;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    // REGISTRO
    public function register(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|unique:personas,email',
            'telefono' => 'nullable|string|max:20',
            'username' => 'required|string|unique:usuarios,username',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $validator->errors()
            ], 422);
        }

        $datos = $validator->validated();

        $rolCliente = Role::where('nombre', 'Cliente')
            ->orWhere('nombre', 'cliente')
            ->first();

        if (!$rolCliente) {
            return response()->json([
                'message' => 'No existe el rol Cliente.'
            ], 422);
        }

        $persona = Persona::create([
            'nombre' => $datos['nombre'],
            'apellido' => $datos['apellido'],
            'email' => $datos['email'],
            'telefono' => $datos['telefono'] ?? null,
        ]);

        $usuario = Usuario::create([
            'personas_id' => $persona->id,
            'roles_id' => $rolCliente->id,
            'username' => $datos['username'],
            'password' => Hash::make($datos['password']),
            'estado' => 1,
        ]);

        $token = $usuario->createToken('token')->plainTextToken;

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'token' => $token,
            'usuario' => $usuario->load('persona', 'role')
        ], 201);
    }

    // LOGIN
    public function login(Request $request)
    {
        $datos = $request->validate([
            'username' => 'required|string',
            'password' => 'required|string'
        ]);

        $usuario = Usuario::where('username', $datos['username'])->first();

        if (!$usuario || !Hash::check($datos['password'], $usuario->password)) {
            return response()->json([
                'message' => 'Credenciales incorrectas'
            ], 401);
        }

        if ($usuario->estado != 1) {
            return response()->json([
                'message' => 'El usuario está inactivo'
            ], 403);
        }

        $token = $usuario->createToken('token')->plainTextToken;

        return response()->json([
            'message' => 'Inicio de sesión correcto',
            'token' => $token,
            'usuario' => $usuario->load('persona', 'role')
        ]);
    }

    // PERFIL
    // El codigo se muestra en pantalla para simular el correo.
    public function solicitarRecuperacion(Request $request)
    {
        $datos = $request->validate([
            'email' => 'required|email',
        ]);

        $email = strtolower(trim($datos['email']));
        $persona = Persona::with('usuario')
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first();

        if (!$persona || !$persona->usuario) {
            return response()->json([
                'message' => 'No existe una cuenta asociada a ese correo.'
            ], 404);
        }

        $codigo = (string) random_int(100000, 999999);

        Cache::put($this->claveRecuperacion($email), [
            'codigo' => Hash::make($codigo),
            'usuario_id' => $persona->usuario->id,
        ], now()->addMinutes(10));

        return response()->json([
            'message' => 'Correo simulado generado correctamente.',
            'codigo_simulado' => $codigo,
            'expira_en_minutos' => 10,
        ]);
    }

    public function restablecerPassword(Request $request)
    {
        $datos = $request->validate([
            'email' => 'required|email',
            'codigo' => 'required|digits:6',
            'password' => 'required|string|min:6|confirmed',
        ]);

        $email = strtolower(trim($datos['email']));
        $clave = $this->claveRecuperacion($email);
        $recuperacion = Cache::get($clave);

        if (
            !$recuperacion ||
            !Hash::check($datos['codigo'], $recuperacion['codigo'])
        ) {
            return response()->json([
                'message' => 'El codigo es incorrecto o ya vencio.'
            ], 422);
        }

        $usuario = Usuario::find($recuperacion['usuario_id']);

        if (!$usuario) {
            Cache::forget($clave);

            return response()->json([
                'message' => 'No se pudo encontrar la cuenta.'
            ], 404);
        }

        $usuario->update([
            'password' => Hash::make($datos['password']),
        ]);
        $usuario->tokens()->delete();
        Cache::forget($clave);

        return response()->json([
            'message' => 'Contrasena actualizada. Ya puedes iniciar sesion.'
        ]);
    }

    private function claveRecuperacion(string $email): string
    {
        return 'recuperacion-password:' . hash('sha256', $email);
    }

    public function miCuenta(Request $request)
    {
        $usuario = $request->user()->load('persona', 'role');

        $cliente = Cliente::where('personas_id', $usuario->personas_id)
            ->with([
                'ventas' => function ($query) {
                    $query->with([
                        'detalles.stock.producto',
                        'comprobante',
                    ])->orderByDesc('fecha');
                },
            ])
            ->first();

        return response()->json([
            'usuario' => $usuario,
            'pedidos' => $cliente?->ventas ?? [],
        ]);
    }

    public function actualizarMiCuenta(Request $request)
    {
        $usuario = $request->user()->load('persona', 'role');
        $persona = $usuario->persona;

        $datos = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                'max:150',
                Rule::unique('personas', 'email')->ignore($persona->id),
            ],
            'dni' => [
                'nullable',
                'digits:8',
                Rule::unique('personas', 'dni')->ignore($persona->id),
            ],
            'telefono' => 'nullable|digits_between:6,15',
            'direccion' => 'nullable|string|max:255',
            'username' => [
                'required',
                'string',
                'min:4',
                'max:100',
                Rule::unique('usuarios', 'username')->ignore($usuario->id),
            ],
        ]);

        $persona->update([
            'nombre' => trim($datos['nombre']),
            'apellido' => trim($datos['apellido']),
            'email' => strtolower(trim($datos['email'])),
            'dni' => $datos['dni'] ?: null,
            'telefono' => $datos['telefono'] ?: null,
            'direccion' => !empty($datos['direccion'])
                ? trim($datos['direccion'])
                : null,
        ]);

        $usuario->update([
            'username' => trim($datos['username']),
        ]);

        return response()->json([
            'message' => 'Perfil actualizado correctamente.',
            'usuario' => $usuario->fresh()->load('persona', 'role'),
        ]);
    }

    public function cambiarMiPassword(Request $request)
    {
        $datos = $request->validate([
            'password_actual' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'password_actual.required' => 'Ingresa tu contraseña actual.',
            'password.required' => 'Ingresa una nueva contraseña.',
            'password.min' => 'La nueva contraseña debe tener al menos 6 caracteres.',
            'password.confirmed' => 'La confirmación de contraseña no coincide.',
        ]);

        $usuario = $request->user();

        if (!Hash::check($datos['password_actual'], $usuario->password)) {
            return response()->json([
                'message' => 'La contraseña actual es incorrecta.',
            ], 422);
        }

        if (Hash::check($datos['password'], $usuario->password)) {
            return response()->json([
                'message' => 'La nueva contraseña debe ser diferente a la actual.',
            ], 422);
        }

        $usuario->update([
            'password' => Hash::make($datos['password']),
        ]);

        return response()->json([
            'message' => 'Contraseña actualizada correctamente.',
        ]);
    }

    public function perfil(Request $request)
    {
        return response()->json([
            'usuario' => $request->user()->load('persona', 'role')
        ]);
    }

    // LOGOUT
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Sesión cerrada correctamente'
        ]);
    }
}
