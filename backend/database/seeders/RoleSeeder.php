<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'id' => 1,
                'nombre' => 'Cliente',
                'descripcion' => 'Cliente de la tienda'
            ],
            [
                'id' => 2,
                'nombre' => 'Vendedor',
                'descripcion' => 'Empleado encargado de ventas'
            ],
            [
                'id' => 3,
                'nombre' => 'Administrador',
                'descripcion' => 'Administrador del sistema'
            ],
        ];

        foreach ($roles as $role) {
            Role::updateOrCreate(
                ['id' => $role['id']],
                $role
            );
        }
    }
}