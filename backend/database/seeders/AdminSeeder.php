<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use App\Models\Persona;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $rolAdmin = Role::where('nombre', 'Administrador')->first();

        $persona = Persona::firstOrCreate(
            ['email' => 'admin@gmail.com'],
            [
                'nombre' => 'Administrador',
                'apellido' => 'Principal',
                'dni' => '00000000',
                'telefono' => '999999999',
                'direccion' => 'Quillabamba',
                'email' => 'admin@gmail.com',
            ]
        );

        Usuario::firstOrCreate(
            ['username' => 'admin'],
            [
                'personas_id' => $persona->id,
                'roles_id' => 3,
                'username' => 'admin',
                'password' => Hash::make('admin123'),
                'estado' => 1,
            ]
        );
    }
}