<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Marca extends Model
{
    protected $table = 'marcas';

    protected $fillable = [
        'nombre',
        'descripcion',
    ];

    public function productos()
    {
        return $this->hasMany(Producto::class, 'marcas_id');
    }
}