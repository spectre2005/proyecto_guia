<?php

namespace App\Http\Controllers;

use App\Models\Persona;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PersonaController extends Controller
{
    public function index()
    {
        $personas = Persona::orderBy('id', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de personas obtenida correctamente',
            'data' => $personas
        ], 200);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:personas,email',

            'dni' => 'nullable|digits:8|unique:personas,dni',
            'telefono' => 'nullable|digits_between:6,15',
            'direccion' => 'nullable|string|max:255',
        ]);

        $persona = Persona::create([
            'nombre' => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'email' => strtolower(trim($request->email)),

            'dni' => $request->dni,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion ? trim($request->direccion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persona registrada correctamente',
            'data' => $persona
        ], 201);
    }

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
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'email' => [
                'required',
                'email',
                'max:150',
                Rule::unique('personas', 'email')->ignore($persona->id)
            ],

            'dni' => [
                'nullable',
                'digits:8',
                Rule::unique('personas', 'dni')->ignore($persona->id)
            ],
            'telefono' => 'nullable|digits_between:6,15',
            'direccion' => 'nullable|string|max:255',
        ]);

        $persona->update([
            'nombre' => trim($request->nombre),
            'apellido' => trim($request->apellido),
            'email' => strtolower(trim($request->email)),

            'dni' => $request->dni,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion ? trim($request->direccion) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Persona actualizada correctamente',
            'data' => $persona
        ], 200);
    }

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