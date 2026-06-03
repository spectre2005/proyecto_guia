<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VentaDetalle extends Model
{
    protected $table = 'venta_detalles';

    protected $fillable = [
        'ventas_id',
        'stocks_id',
        'cantidad',
        'precio_unitario',
        'subtotal',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class, 'ventas_id');
    }

    public function stock()
    {
        return $this->belongsTo(Stock::class, 'stocks_id');
    }
}