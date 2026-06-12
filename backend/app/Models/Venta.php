<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Venta extends Model
{
    protected $table = 'ventas';

    protected $fillable = [
        'clientes_id',
        'usuarios_id',
        'fecha',
        'total',
        'metodo_pago',
        'monto_recibido',
        'vuelto',
        'estado',
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'clientes_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }

    public function detalles()
    {
        return $this->hasMany(VentaDetalle::class, 'ventas_id');
    }

    public function comprobante()
    {
        return $this->hasOne(Comprobante::class, 'ventas_id');
    }
}
