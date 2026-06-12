<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Talla;

class TallaSeeder extends Seeder
{
    public function run(): void
    {
        $tallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

        foreach ($tallas as $talla) {
            Talla::firstOrCreate([
                'nombre' => $talla
            ]);
        }
    }
}