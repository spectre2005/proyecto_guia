<?php

namespace Database\Seeders;

use App\Models\Color;
use Illuminate\Database\Seeder;

class ColorSeeder extends Seeder
{
    public function run(): void
    {
        $colores = [
            ['nombre' => 'Negro', 'codigo_hex' => '#000000'],
            ['nombre' => 'Blanco', 'codigo_hex' => '#FFFFFF'],
            ['nombre' => 'Gris', 'codigo_hex' => '#808080'],
            ['nombre' => 'Azul', 'codigo_hex' => '#2563EB'],
            ['nombre' => 'Azul marino', 'codigo_hex' => '#172554'],
            ['nombre' => 'Celeste', 'codigo_hex' => '#38BDF8'],
            ['nombre' => 'Rojo', 'codigo_hex' => '#DC2626'],
            ['nombre' => 'Verde', 'codigo_hex' => '#16A34A'],
            ['nombre' => 'Amarillo', 'codigo_hex' => '#FACC15'],
            ['nombre' => 'Naranja', 'codigo_hex' => '#F97316'],
            ['nombre' => 'Rosado', 'codigo_hex' => '#EC4899'],
            ['nombre' => 'Morado', 'codigo_hex' => '#9333EA'],
            ['nombre' => 'Marrón', 'codigo_hex' => '#78350F'],
            ['nombre' => 'Beige', 'codigo_hex' => '#D6C6A5'],
        ];

        foreach ($colores as $color) {
            Color::firstOrCreate(
                ['nombre' => $color['nombre']],
                $color
            );
        }
    }
}
