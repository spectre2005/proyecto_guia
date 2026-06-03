<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompraDetalle extends Model
{
    protected $table = 'compra_detalles';

    protected $fillable = [
        'compras_id',
        'productos_id',
        'cantidad',
        'precio',
        'subtotal',
    ];

    public function compra()
    {
        return $this->belongsTo(Compra::class, 'compras_id');
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'productos_id');
    }
}