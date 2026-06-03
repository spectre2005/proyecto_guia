<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'categorias_id',
        'marcas_id',
        'nombre',
        'descripcion',
        'precio',
        'imagen',
        'codigo',
        'estado',
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categorias_id');
    }

    public function marca()
    {
        return $this->belongsTo(Marca::class, 'marcas_id');
    }

    public function stocks()
    {
        return $this->hasMany(Stock::class, 'productos_id');
    }

    public function compraDetalles()
    {
        return $this->hasMany(CompraDetalle::class, 'productos_id');
    }
}