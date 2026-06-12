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
        'registro_id',
        'descripcion',
        'ip',
        'fecha',
    ];

    protected $casts = [
        'fecha' => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }
}
