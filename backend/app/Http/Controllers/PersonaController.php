<?php

namespace App\Http\Controllers;

use App\Models\Persona;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PersonaController extends Controller
{
    /**
     * Listar todas las personas.
     */
    public function index()
    {
        $personas = Persona::orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de personas obtenida correctamente',
            'data' => $personas
        ], 200);
    }

    /**
     * Registrar una nueva persona.
     */
    public function store(Request $request)
    {
        $request->validate([
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
                'unique:personas,dni'
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
                'unique:personas,email'
            ],
        ], [
            'nombre.required' => 'El nombre es obligatorio.',
            'nombre.string' => 'El nombre debe ser texto.',
            'nombre.max' => 'El nombre no debe superar los 100 caracteres.',

            'apellido.required' => 'El apellido es obligatorio.',
            'apellido.string' => 'El apellido debe ser texto.',
            'apellido.max' => 'El apellido no debe superar los 100 caracteres.',

            'dni.digits' => 'El DNI debe tener exactamente 8 dígitos.',
            'dni.unique' => 'Este DNI ya se encuentra registrado.',

            'telefono.digits_between' => 'El teléfono debe tener entre 6 y 15 dígitos.',

            'direccion.string' => 'La dirección debe ser texto.',
            'direccion.max' => 'La dirección no debe superar los 255 caracteres.',

            'email.email' => 'Debe ingresar un correo electrónico válido.',
            'email.max' => 'El correo no debe superar los 150 caracteres.',
            'email.unique' => 'Este correo ya se encuentra registrado.',
        ]);

        $persona = Persona::create([
            'nombre' => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'dni' => $request->dni,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion ? trim($request->direccion) : null,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persona registrada correctamente',
            'data' => $persona
        ], 201);
    }

    /**
     * Mostrar una persona específica.
     */
    public function show($id)
    {
        $persona = Persona::with(['usuario', 'cliente'])->find($id);

        if (!$persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Persona encontrada correctamente',
            'data' => $persona
        ], 200);
    }

    /**
     * Actualizar una persona.
     */
    public function update(Request $request, $id)
    {
        $persona = Persona::find($id);

        if (!$persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona no encontrada'
            ], 404);
        }

        $request->validate([
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
            'nombre.string' => 'El nombre debe ser texto.',
            'nombre.max' => 'El nombre no debe superar los 100 caracteres.',

            'apellido.required' => 'El apellido es obligatorio.',
            'apellido.string' => 'El apellido debe ser texto.',
            'apellido.max' => 'El apellido no debe superar los 100 caracteres.',

            'dni.digits' => 'El DNI debe tener exactamente 8 dígitos.',
            'dni.unique' => 'Este DNI ya se encuentra registrado.',

            'telefono.digits_between' => 'El teléfono debe tener entre 6 y 15 dígitos.',

            'direccion.string' => 'La dirección debe ser texto.',
            'direccion.max' => 'La dirección no debe superar los 255 caracteres.',

            'email.email' => 'Debe ingresar un correo electrónico válido.',
            'email.max' => 'El correo no debe superar los 150 caracteres.',
            'email.unique' => 'Este correo ya se encuentra registrado.',
        ]);

        $persona->update([
            'nombre' => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'dni' => $request->dni,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion ? trim($request->direccion) : null,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persona actualizada correctamente',
            'data' => $persona
        ], 200);
    }

    /**
     * Eliminar una persona.
     */
    public function destroy($id)
    {
        $persona = Persona::with(['usuario', 'cliente'])->find($id);

        if (!$persona) {
            return response()->json([
                'success' => false,
                'message' => 'Persona no encontrada'
            ], 404);
        }

        if ($persona->usuario || $persona->cliente) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar la persona porque está vinculada a un usuario o cliente'
            ], 409);
        }

        $persona->delete();

        return response()->json([
            'success' => true,
            'message' => 'Persona eliminada correctamente'
        ], 200);
    }
}