<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Persona extends Model
{
    protected $table = 'personas';

    protected $fillable = [
        'nombre',
        'apellido',
        'dni',
        'telefono',
        'direccion',
        'email',
    ];

    public function usuario()
    {
        return $this->hasOne(Usuario::class, 'personas_id');
    }

    public function cliente()
    {
        return $this->hasOne(Cliente::class, 'personas_id');
    }
}