<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Producto extends Model
{
    protected $table = 'productos';

    protected $fillable = [
        'categorias_id',
        'marcas_id',
        'materiales_id',
        'nombre',
        'descripcion',
        'imagen',
        'estado',
        'genero',
    ];

    public function categoria()
    {
        return $this->belongsTo(
            Categoria::class,
            'categorias_id'
        );
    }

    public function marca()
    {
        return $this->belongsTo(
            Marca::class,
            'marcas_id'
        );
    }

    public function material()
    {
        return $this->belongsTo(
            Materiale::class,
            'materiales_id'
        );
    }

    public function stocks()
    {
        return $this->hasMany(
            Stock::class,
            'productos_id'
        );
    }

    public function compraDetalles()
    {
        return $this->hasMany(
            CompraDetalle::class,
            'productos_id'
        );
    }

    public function getStockTotalAttribute()
    {
        return $this->stocks->sum('cantidad');
    }

    public function getPrecioMinimoAttribute()
    {
        return $this->stocks->min('precio');
    }

    public function getPrecioMaximoAttribute()
    {
        return $this->stocks->max('precio');
    }
}
