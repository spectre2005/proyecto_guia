<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reporte extends Model
{
    protected $table = 'reportes';

    protected $fillable = [
        'usuarios_id',
        'tipo',
        'fecha_generacion',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuarios_id');
    }
}