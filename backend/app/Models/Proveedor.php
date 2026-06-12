<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Proveedor extends Model
{
    protected $table = 'proveedores';

    protected $fillable = [
        'nombre_empresa',
        'contacto',
        'ruc',
        'telefono',
        'email',
        'direccion',
        'dias_credito',
        'estado',
        'notas',
    ];

    public function compras()
    {
        return $this->hasMany(Compra::class, 'proveedores_id');
    }

    public function pagos()
    {
        return $this->hasMany(PagoProveedor::class, 'proveedores_id');
    }
}
