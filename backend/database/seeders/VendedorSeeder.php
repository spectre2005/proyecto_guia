<?php

namespace Database\Seeders;

use App\Models\Persona;
use App\Models\Role;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class VendedorSeeder extends Seeder
{
    public function run(): void
    {
        $rolVendedor = Role::where('nombre', 'Vendedor')->firstOrFail();
        $persona = Persona::firstOrCreate(
            ['email' => 'vendedor@tienda.local'],
            [
                'nombre' => 'Vendedor',
                'apellido' => 'Principal',
                'dni' => '00000001',
                'telefono' => '999999998',
                'direccion' => 'Quillabamba',
            ]
        );

        Usuario::updateOrCreate(
            ['username' => 'vendedor'],
            [
                'personas_id' => $persona->id,
                'roles_id' => $rolVendedor->id,
                'password' => Hash::make('vendedor123'),
                'estado' => true,
            ]
        );
    }
}
