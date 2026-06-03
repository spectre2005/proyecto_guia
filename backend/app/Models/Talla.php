<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Talla extends Model
{
    protected $table = 'tallas';

    protected $fillable = [
        'nombre',
    ];

    public function stocks()
    {
        return $this->hasMany(Stock::class, 'tallas_id');
    }
}  use HasFactory;
