<?php

namespace Database\Seeders;

use App\Models\Materiale;
use Illuminate\Database\Seeder;

class MaterialSeeder extends Seeder
{
    public function run(): void
    {
        $materiales = [
            'Algodón',
            'Denim',
            'Poliéster',
            'Lino',
            'Lana',
            'Cuero',
            'Viscosa',
            'Elastano',
        ];

        foreach ($materiales as $nombre) {
            Materiale::firstOrCreate(['nombre' => $nombre]);
        }
    }
}
