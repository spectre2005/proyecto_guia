<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Comprobante extends Model
{
    protected $table = 'comprobantes';

    protected $fillable = [
        'ventas_id',
        'tipo',
        'numero',
        'fecha',
    ];

    public function venta()
    {
        return $this->belongsTo(Venta::class, 'ventas_id');
    }
}