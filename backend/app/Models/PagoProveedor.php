<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PagoProveedor extends Model
{
    protected $table = 'pagos_proveedores';

    protected $fillable = [
        'proveedores_id',
        'compras_id',
        'usuarios_id',
        'fecha',
        'monto',
        'metodo',
        'referencia',
        'observacion',
    ];

    public function proveedor()
    {
        return $this->belongsTo(Proveedor::class, 'proveedores_id');
    }

    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compras_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }
}
