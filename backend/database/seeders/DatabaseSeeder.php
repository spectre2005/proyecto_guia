<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            TallaSeeder::class,
            CategoriaSeeder::class,
            ColorSeeder::class,
            MarcaSeeder::class,
            MaterialSeeder::class,
            AdminSeeder::class,
            VendedorSeeder::class,
        ]);
    }
}
