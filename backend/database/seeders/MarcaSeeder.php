<?php

namespace Database\Seeders;

use App\Models\Marca;
use Illuminate\Database\Seeder;

class MarcaSeeder extends Seeder
{
    public function run(): void
    {
        $marcas = [
            [
                'nombre' => 'Levi\'s',
                'descripcion' => 'Marca especializada en jeans y ropa casual.',
            ],
            [
                'nombre' => 'Wrangler',
                'descripcion' => 'Jeans, camisas y prendas de estilo casual.',
            ],
            [
                'nombre' => 'Lee',
                'descripcion' => 'Ropa de mezclilla y prendas urbanas.',
            ],
            [
                'nombre' => 'Nike',
                'descripcion' => 'Ropa, calzado y accesorios deportivos.',
            ],
            [
                'nombre' => 'Adidas',
                'descripcion' => 'Prendas y accesorios deportivos.',
            ],
            [
                'nombre' => 'Puma',
                'descripcion' => 'Ropa deportiva y moda urbana.',
            ],
            [
                'nombre' => 'Tommy Hilfiger',
                'descripcion' => 'Ropa casual de estilo clásico.',
            ],
            [
                'nombre' => 'Calvin Klein',
                'descripcion' => 'Ropa casual, jeans y accesorios.',
            ],
            [
                'nombre' => 'Lacoste',
                'descripcion' => 'Polos y prendas casuales.',
            ],
            [
                'nombre' => 'Guess',
                'descripcion' => 'Jeans y moda casual contemporánea.',
            ],
            [
                'nombre' => 'Zara',
                'descripcion' => 'Ropa de moda para hombre y mujer.',
            ],
            [
                'nombre' => 'H&M',
                'descripcion' => 'Prendas modernas y accesorios.',
            ],
            [
                'nombre' => 'Genérica',
                'descripcion' => 'Productos que no tienen una marca específica.',
            ],
        ];

        foreach ($marcas as $marca) {
            Marca::firstOrCreate(
                ['nombre' => $marca['nombre']],
                $marca
            );
        }
    }
}
