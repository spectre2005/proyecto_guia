<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Usuario extends Model
{
    protected $table = 'usuarios';

    protected $fillable = [
        'personas_id',
        'roles_id',
        'username',
        'password',
        'estado',
    ];

    protected $hidden = [
        'password',
    ];

    public function persona()
    {
        return $this->belongsTo(Persona::class, 'personas_id');
    }

    public function role()
    {
        return $this->belongsTo(Role::class, 'roles_id');
    }

    public function compras()
    {
        return $this->hasMany(Compra::class, 'usuarios_id');
    }

    public function ventas()
    {
        return $this->hasMany(Venta::class, 'usuarios_id');
    }

    public function carritos()
    {
        return $this->hasMany(Carrito::class, 'usuarios_id');
    }

    public function reportes()
    {
        return $this->hasMany(Reporte::class, 'usuarios_id');
    }

    public function auditorias()
    {
        return $this->hasMany(Auditoria::class, 'usuarios_id');
    }
}