<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Laravel\Sanctum\HasApiTokens;

class Usuario extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

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
        'remember_token',
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