<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            [
                'nombre' => 'Jeans',
                'descripcion' => 'Pantalones jeans para hombre y mujer'
            ],
            [
                'nombre' => 'Polos',
                'descripcion' => 'Polos casuales y deportivos'
            ],
            [
                'nombre' => 'Casacas',
                'descripcion' => 'Casacas para clima frío'
            ],
            [
                'nombre' => 'Camisas',
                'descripcion' => 'Camisas formales e informales'
            ],
            [
                'nombre' => 'Pantalones',
                'descripcion' => 'Pantalones de vestir y casuales'
            ],
            [
                'nombre' => 'Shorts',
                'descripcion' => 'Shorts para verano y deporte'
            ],
            [
                'nombre' => 'Ropa deportiva',
                'descripcion' => 'Prendas deportivas para entrenamiento'
            ],
            [
                'nombre' => 'Accesorios',
                'descripcion' => 'Gorras, correas y accesorios'
            ],
        ];

        foreach ($categorias as $categoria) {
            Categoria::firstOrCreate(
                ['nombre' => $categoria['nombre']],
                $categoria
            );
        }
    }
}