<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cliente extends Model
{
    protected $table = 'clientes';

    protected $fillable = [
        'personas_id',
    ];

    public function persona()
    {
        return $this->belongsTo(Persona::class, 'personas_id');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'clientes_id');
    }
}