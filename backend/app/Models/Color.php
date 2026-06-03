<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Color extends Model
{
    protected $table = 'colores';

    protected $fillable = [
        'nombre',
        'codigo_hex',
    ];

    public function stocks()
    {
        return $this->hasMany(Stock::class, 'colores_id');
    }
}