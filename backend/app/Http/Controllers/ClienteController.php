<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ClienteController extends Controller
{
    /**
     * Listar todos los clientes.
     */
    public function index(Request $request)
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:150'],
        ]);

        $clientes = Cliente::with([
                'persona.usuario:id,personas_id,username,estado'
            ])
            ->withCount('ventas')
            ->withSum('ventas as total_gastado', 'total')
            ->withMax('ventas as ultima_compra', 'fecha')
            ->when($request->filled('buscar'), function ($query) use ($request) {
                $texto = trim($request->buscar);

                $query->whereHas('persona', function ($personaQuery) use ($texto) {
                    $personaQuery->where(function ($subquery) use ($texto) {
                        $subquery
                            ->where('nombre', 'like', "%{$texto}%")
                            ->orWhere('apellido', 'like', "%{$texto}%")
                            ->orWhere('dni', 'like', "%{$texto}%")
                            ->orWhere('telefono', 'like', "%{$texto}%")
                            ->orWhere('email', 'like', "%{$texto}%");
                    });
                });
            })
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de clientes obtenida correctamente',
            'data' => $clientes
        ], 200);
    }

    /**
     * Registrar un nuevo cliente.
     */
    public function store(Request $request)
    {
        $request->validate([
            'personas_id' => [
                'required',
                'exists:personas,id',
                'unique:clientes,personas_id'
            ],
        ], [
            'personas_id.required' => 'La persona es obligatoria.',
            'personas_id.exists' => 'La persona seleccionada no existe.',
            'personas_id.unique' => 'Esta persona ya está registrada como cliente.',
        ]);

        $cliente = Cliente::create([
            'personas_id' => $request->personas_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cliente registrado correctamente',
            'data' => $cliente->load('persona')
        ], 201);
    }

    /**
     * Mostrar un cliente específico.
     */
    public function show($id)
    {
        $cliente = Cliente::with([
                'persona.usuario:id,personas_id,username,estado',
                'ventas' => function ($query) {
                    $query->with([
                        'usuario.persona',
                        'detalles.stock.producto',
                        'detalles.stock.talla',
                        'detalles.stock.color',
                        'comprobante',
                    ])->orderByDesc('fecha');
                },
            ])
            ->withCount('ventas')
            ->withSum('ventas as total_gastado', 'total')
            ->withMax('ventas as ultima_compra', 'fecha')
            ->find($id);

        if (!$cliente) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cliente encontrado correctamente',
            'data' => $cliente
        ], 200);
    }

    /**
     * Actualizar cliente.
     */
    public function update(Request $request, $id)
    {
        $cliente = Cliente::find($id);

        if (!$cliente) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        $persona = $cliente->persona;

        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100'
            ],
            'apellido' => [
                'required',
                'string',
                'max:100'
            ],
            'dni' => [
                'nullable',
                'digits:8',
                Rule::unique('personas', 'dni')->ignore($persona->id)
            ],
            'telefono' => [
                'nullable',
                'digits_between:6,15'
            ],
            'direccion' => [
                'nullable',
                'string',
                'max:255'
            ],
            'email' => [
                'nullable',
                'email',
                'max:150',
                Rule::unique('personas', 'email')->ignore($persona->id)
            ],
        ], [
            'nombre.required' => 'El nombre es obligatorio.',
            'apellido.required' => 'El apellido es obligatorio.',
            'dni.digits' => 'El DNI debe tener 8 dígitos.',
            'dni.unique' => 'El DNI ya está registrado.',
            'telefono.digits_between' => 'El teléfono debe tener entre 6 y 15 dígitos.',
            'email.email' => 'Ingresa un correo válido.',
            'email.unique' => 'El correo ya está registrado.',
        ]);

        DB::transaction(function () use ($persona, $datos) {
            $persona->update([
                'nombre' => trim($datos['nombre']),
                'apellido' => trim($datos['apellido']),
                'dni' => !empty($datos['dni']) ? $datos['dni'] : null,
                'telefono' => !empty($datos['telefono'])
                    ? $datos['telefono']
                    : null,
                'direccion' => !empty($datos['direccion'])
                    ? trim($datos['direccion'])
                    : null,
                'email' => !empty($datos['email'])
                    ? strtolower(trim($datos['email']))
                    : null,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Cliente actualizado correctamente',
            'data' => $cliente->fresh([
                'persona.usuario:id,personas_id,username,estado'
            ])
        ], 200);
    }

    /**
     * Eliminar cliente.
     */
    public function destroy($id)
    {
        $cliente = Cliente::withCount('ventas')->find($id);

        if (!$cliente) {
            return response()->json([
                'success' => false,
                'message' => 'Cliente no encontrado'
            ], 404);
        }

        if ($cliente->ventas_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el cliente porque tiene ventas registradas'
            ], 409);
        }

        $cliente->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cliente eliminado correctamente'
        ], 200);
    }
}
