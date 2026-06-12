<?php

namespace App\Http\Controllers;

use App\Models\Compra;
use App\Models\PagoProveedor;
use App\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProveedorController extends Controller
{
    /**
     * Listar todos los proveedores.
     */
    public function index(Request $request)
    {
        $request->validate([
            'buscar' => ['nullable', 'string', 'max:150'],
        ]);

        $proveedores = Proveedor::withCount([
                'compras',
                'compras as compras_vencidas' => function ($query) {
                    $query
                        ->whereColumn('monto_pagado', '<', 'total')
                        ->whereDate('fecha_vencimiento', '<', today());
                },
            ])
            ->withSum('compras as total_comprado', 'total')
            ->withSum('compras as total_pagado', 'monto_pagado')
            ->withMax('compras as ultima_compra', 'fecha')
            ->when($request->filled('buscar'), function ($query) use ($request) {
                $texto = trim($request->buscar);
                $query->where(function ($subquery) use ($texto) {
                    $subquery
                        ->where('nombre_empresa', 'like', "%{$texto}%")
                        ->orWhere('contacto', 'like', "%{$texto}%")
                        ->orWhere('ruc', 'like', "%{$texto}%")
                        ->orWhere('telefono', 'like', "%{$texto}%")
                        ->orWhere('email', 'like', "%{$texto}%");
                });
            })
            ->orderBy('id', 'desc')
            ->get();

        $proveedores->each(function ($proveedor) {
            $proveedor->setAttribute(
                'saldo_pendiente',
                max(
                    0,
                    (float) $proveedor->total_comprado -
                        (float) $proveedor->total_pagado
                )
            );
        });

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

            'contacto' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'dias_credito' => ['nullable', 'integer', 'min:0', 'max:365'],
            'estado' => ['nullable', 'boolean'],
            'notas' => ['nullable', 'string', 'max:1000'],

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
            'email.email' => 'Ingresa un correo válido.',
            'dias_credito.max' => 'Los días de crédito no pueden superar 365.',
        ]);

        $proveedor = Proveedor::create([
            'nombre_empresa' => trim($request->nombre_empresa),
            'contacto' => $request->contacto ? trim($request->contacto) : null,
            'ruc' => $request->ruc,
            'telefono' => $request->telefono,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
            'direccion' => $request->direccion
                ? trim($request->direccion)
                : null,
            'dias_credito' => $request->dias_credito ?? 0,
            'estado' => $request->estado ?? true,
            'notas' => $request->notas ? trim($request->notas) : null,
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
                'compras' => function ($query) {
                    $query->with([
                        'usuario.persona',
                        'detalles.producto',
                        'detalles.stock.talla',
                        'detalles.stock.color',
                        'pagos.usuario.persona',
                    ])->orderByDesc('fecha');
                },
                'pagos' => function ($query) {
                    $query->with(['compra', 'usuario.persona'])
                        ->orderByDesc('fecha');
                },
            ])
            ->withCount('compras')
            ->withSum('compras as total_comprado', 'total')
            ->withSum('compras as total_pagado', 'monto_pagado')
            ->withMax('compras as ultima_compra', 'fecha')
            ->find($id);

        if (!$proveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }

        $proveedor->setAttribute(
            'saldo_pendiente',
            max(
                0,
                (float) $proveedor->total_comprado -
                    (float) $proveedor->total_pagado
            )
        );

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

            'contacto' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150'],
            'dias_credito' => ['nullable', 'integer', 'min:0', 'max:365'],
            'estado' => ['nullable', 'boolean'],
            'notas' => ['nullable', 'string', 'max:1000'],

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
            'email.email' => 'Ingresa un correo válido.',
            'dias_credito.max' => 'Los días de crédito no pueden superar 365.',
        ]);

        $proveedor->update([
            'nombre_empresa' => trim($request->nombre_empresa),
            'contacto' => $request->contacto ? trim($request->contacto) : null,
            'ruc' => $request->ruc,
            'telefono' => $request->telefono,
            'email' => $request->email ? strtolower(trim($request->email)) : null,
            'direccion' => $request->direccion
                ? trim($request->direccion)
                : null,
            'dias_credito' => $request->dias_credito ?? 0,
            'estado' => $request->estado ?? true,
            'notas' => $request->notas ? trim($request->notas) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Proveedor actualizado correctamente',
            'data' => $proveedor
        ], 200);
    }

    public function registrarPago(Request $request, $id)
    {
        $datos = $request->validate([
            'compras_id' => ['required', 'integer', 'exists:compras,id'],
            'usuarios_id' => ['nullable', 'integer', 'exists:usuarios,id'],
            'fecha' => ['required', 'date'],
            'monto' => ['required', 'numeric', 'min:0.01'],
            'metodo' => [
                'required',
                Rule::in(['efectivo', 'transferencia', 'yape', 'tarjeta', 'otro']),
            ],
            'referencia' => ['nullable', 'string', 'max:100'],
            'observacion' => ['nullable', 'string', 'max:500'],
        ], [
            'compras_id.required' => 'Selecciona la compra que deseas pagar.',
            'monto.required' => 'Ingresa el monto del pago.',
            'monto.min' => 'El pago debe ser mayor a cero.',
            'metodo.required' => 'Selecciona el método de pago.',
        ]);

        $proveedor = Proveedor::find($id);

        if (!$proveedor) {
            return response()->json([
                'success' => false,
                'message' => 'Proveedor no encontrado'
            ], 404);
        }

        $pago = DB::transaction(function () use ($datos, $proveedor) {
            $compra = Compra::where('id', $datos['compras_id'])
                ->where('proveedores_id', $proveedor->id)
                ->lockForUpdate()
                ->first();

            if (!$compra) {
                abort(422, 'La compra no pertenece a este proveedor.');
            }

            $saldo = max(
                0,
                (float) $compra->total - (float) $compra->monto_pagado
            );

            if ((float) $datos['monto'] > $saldo) {
                abort(422, 'El pago no puede superar el saldo pendiente.');
            }

            $pago = PagoProveedor::create([
                'proveedores_id' => $proveedor->id,
                'compras_id' => $compra->id,
                'usuarios_id' => $datos['usuarios_id'] ?? null,
                'fecha' => $datos['fecha'],
                'monto' => $datos['monto'],
                'metodo' => $datos['metodo'],
                'referencia' => $datos['referencia'] ?? null,
                'observacion' => $datos['observacion'] ?? null,
            ]);

            $nuevoPagado = min(
                (float) $compra->total,
                (float) $compra->monto_pagado + (float) $datos['monto']
            );

            $compra->update([
                'monto_pagado' => $nuevoPagado,
                'estado_pago' => $nuevoPagado >= (float) $compra->total
                    ? 'pagado'
                    : 'parcial',
            ]);

            return $pago;
        });

        return response()->json([
            'success' => true,
            'message' => 'Pago registrado correctamente',
            'data' => $pago->load(['compra', 'usuario.persona']),
        ], 201);
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
