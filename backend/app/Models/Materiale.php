<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Materiale extends Model
{
    use HasFactory;

    protected $table = 'materiales';

    protected $fillable = [
        'nombre',
    ];

    public function productos()
    {
        return $this->hasMany(Producto::class, 'materiales_id');
    }
}
