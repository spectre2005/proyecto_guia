<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Compra extends Model
{
    protected $table = 'compras';

    protected $fillable = [
        'proveedores_id',
        'usuarios_id',
        'fecha',
        'numero_documento',
        'fecha_vencimiento',
        'total',
        'monto_pagado',
        'estado_pago',
        'observaciones',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedores_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }

    public function detalles()
    {
        return $this->hasMany(CompraDetalle::class, 'compras_id');
    }

    public function pagos()
    {
        return $this->hasMany(PagoProveedor::class, 'compras_id');
    }
}
