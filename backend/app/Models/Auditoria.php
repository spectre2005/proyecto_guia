<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Auditoria extends Model
{
    protected $table = 'auditorias';

    protected $fillable = [
        'usuarios_id',
        'accion',
        'tabla_afectada',
        'fecha',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }
}