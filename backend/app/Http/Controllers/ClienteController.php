<?php

namespace App\Http\Controllers;

use App\Models\Cliente;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ClienteController extends Controller
{
    /**
     * Listar todos los clientes.
     */
    public function index()
    {
        $clientes = Cliente::with('persona')
            ->withCount('ventas')
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
        $cliente = Cliente::with(['persona', 'ventas.detalles.stock.producto'])
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

        $request->validate([
            'personas_id' => [
                'required',
                'exists:personas,id',
                Rule::unique('clientes', 'personas_id')->ignore($cliente->id)
            ],
        ], [
            'personas_id.required' => 'La persona es obligatoria.',
            'personas_id.exists' => 'La persona seleccionada no existe.',
            'personas_id.unique' => 'Esta persona ya está registrada como cliente.',
        ]);

        $cliente->update([
            'personas_id' => $request->personas_id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Cliente actualizado correctamente',
            'data' => $cliente->load('persona')
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