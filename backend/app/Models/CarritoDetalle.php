<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CarritoDetalle extends Model
{
    protected $table = 'carrito_detalles';

    protected $fillable = [
        'carrito_id',
        'stocks_id',
        'cantidad',
        'precio',
    ];

    public function carrito()
    {
        return $this->belongsTo(Carrito::class, 'carrito_id');
    }

    public function stock()
    {
        return $this->belongsTo(Stock::class, 'stocks_id');
    }
}