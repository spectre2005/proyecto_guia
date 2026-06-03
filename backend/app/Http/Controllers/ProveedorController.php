<?php

namespace App\Http\Controllers;

use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProveedorController extends Controller
{
    /**
     * Listar todos los proveedores.
     */
    public function index()
    {
        $proveedores = Proveedor::withCount('compras')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de proveedores obtenida correctamente',
            'data' => $proveedores
        ], 200);
    }

    /**
     * Registrar un nuevo proveedor.
     */
    public function store(Request $request)
    {
        $request->validate([
            'nombre_empresa' => [
                'required',
                'string',
                'max:150',
                'unique:proveedores,nombre_empresa'
            ],

            'ruc' => [
                'nullable',
                'digits:11',
                'unique:proveedores,ruc'
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

        ], [

            'nombre_empresa.required' => 'El nombre de la empresa es obligatorio.',
            'nombre_empresa.string' => 'El nombre de la empresa debe ser texto.',
            'nombre_empresa.max' => 'El nombre de la empresa no debe superar los 150 caracteres.',
            'nombre_empresa.unique' => 'Este proveedor ya se encuentra registrado.',

            'ruc.digits' => 'El RUC debe tener exactamente 11 dígitos.',
            'ruc.unique' => 'Este RUC ya se encuentra registrado.',

            'telefono.digits_between' => 'El teléfono debe tener entre 6 y 15 dígitos.',

            'direccion.string' => 'La dirección debe ser texto.',
            'direccion.max' => 'La dirección no debe superar los 255 caracteres.',
        ]);

        $proveedor = Proveedor::create([
            'nombre_empresa' => trim($request->nombre_empresa),
            'ruc' => $request->ruc,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion
                ? trim($request->direccion)
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor registrado correctamente',
            'data' => $proveedor
        ], 201);
    }

    /**
     * Mostrar un proveedor específico.
     */
    public function show($id)
    {
        $proveedor = Proveedor::with([
            'compras.detalles.producto'
        ])->find($id);

        if (!$proveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Proveedor encontrado correctamente',
            'data' => $proveedor
        ], 200);
    }

    /**
     * Actualizar proveedor.
     */
    public function update(Request $request, $id)
    {
        $proveedor = Proveedor::find($id);

        if (!$proveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }

        $request->validate([
            'nombre_empresa' => [
                'required',
                'string',
                'max:150',
                Rule::unique('proveedores', 'nombre_empresa')
                    ->ignore($proveedor->id)
            ],

            'ruc' => [
                'nullable',
                'digits:11',
                Rule::unique('proveedores', 'ruc')
                    ->ignore($proveedor->id)
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

        ], [

            'nombre_empresa.required' => 'El nombre de la empresa es obligatorio.',
            'nombre_empresa.string' => 'El nombre de la empresa debe ser texto.',
            'nombre_empresa.max' => 'El nombre de la empresa no debe superar los 150 caracteres.',
            'nombre_empresa.unique' => 'Este proveedor ya se encuentra registrado.',

            'ruc.digits' => 'El RUC debe tener exactamente 11 dígitos.',
            'ruc.unique' => 'Este RUC ya se encuentra registrado.',

            'telefono.digits_between' => 'El teléfono debe tener entre 6 y 15 dígitos.',

            'direccion.string' => 'La dirección debe ser texto.',
            'direccion.max' => 'La dirección no debe superar los 255 caracteres.',
        ]);

        $proveedor->update([
            'nombre_empresa' => trim($request->nombre_empresa),
            'ruc' => $request->ruc,
            'telefono' => $request->telefono,
            'direccion' => $request->direccion
                ? trim($request->direccion)
                : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor actualizado correctamente',
            'data' => $proveedor
        ], 200);
    }

    /**
     * Eliminar proveedor.
     */
    public function destroy($id)
    {
        $proveedor = Proveedor::withCount('compras')->find($id);

        if (!$proveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }

        if ($proveedor->compras_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el proveedor porque tiene compras registradas'
            ], 409);
        }

        $proveedor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Proveedor eliminado correctamente'
        ], 200);
    }
}