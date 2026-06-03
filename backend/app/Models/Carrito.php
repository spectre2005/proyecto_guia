<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Carrito extends Model
{
    protected $table = 'carritos';

    protected $fillable = [
        'usuarios_id',
        'estado',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }

    public function detalles()
    {
        return $this->hasMany(CarritoDetalle::class, 'carrito_id');
    }
}