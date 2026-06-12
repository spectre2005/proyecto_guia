<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReporteComprasTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $administrador = Usuario::whereHas(
            'role',
            fn ($query) => $query->where('nombre', 'Administrador')
        )->firstOrFail();
        Sanctum::actingAs($administrador);
    }

    public function test_reporte_de_compras_acepta_periodos_y_devuelve_resumen(): void
    {
        $response = $this->getJson(
            '/api/reportes-compras?periodo=mes&referencia=2026-06-11'
        );

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'data' => [
                    'periodo',
                    'fecha_inicio',
                    'fecha_fin',
                    'cantidad_compras',
                    'total_compras',
                    'total_pagado',
                    'deuda_pendiente',
                    'promedio_compra',
                    'unidades_compradas',
                    'resumen_diario',
                    'metodos_pago',
                    'proveedores',
                    'productos_comprados',
                    'productos_menos_comprados',
                    'compras',
                ],
            ]);
    }

    public function test_reporte_de_compras_valida_un_rango_incorrecto(): void
    {
        $this->getJson(
            '/api/reportes-compras?periodo=rango'
            . '&fecha_inicio=2026-06-11&fecha_fin=2026-06-10'
        )->assertUnprocessable();
    }
}
