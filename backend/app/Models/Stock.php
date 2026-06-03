<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stock extends Model
{
    protected $table = 'stocks';

    protected $fillable = [
        'productos_id',
        'tallas_id',
        'colores_id',
        'cantidad',
        'stock_minimo',
    ];

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'productos_id');
    }

    public function talla()
    {
        return $this->belongsTo(Talla::class, 'tallas_id');
    }

    public function color()
    {
        return $this->belongsTo(Color::class, 'colores_id');
    }

    public function ventaDetalles()
    {
        return $this->hasMany(VentaDetalle::class, 'stocks_id');
    }

    public function carritoDetalles()
    {
        return $this->hasMany(CarritoDetalle::class, 'stocks_id');
    }
}