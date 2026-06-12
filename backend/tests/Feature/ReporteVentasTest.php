<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReporteVentasTest extends TestCase
{
    public function test_sales_report_calculates_period_boundaries(): void
    {
        $administrador = Usuario::whereHas(
            'role',
            fn ($query) => $query->where('nombre', 'Administrador')
        )->firstOrFail();
        Sanctum::actingAs($administrador);

        $this->getJson(
            '/api/reportes-ventas?periodo=semana&referencia=2026-06-11'
        )
            ->assertOk()
            ->assertJsonPath('data.fecha_inicio', '2026-06-08')
            ->assertJsonPath('data.fecha_fin', '2026-06-14')
            ->assertJsonStructure([
                'data' => [
                    'cantidad_ventas',
                    'total_ventas',
                    'promedio_venta',
                    'unidades_vendidas',
                    'metodos_pago',
                    'productos_vendidos',
                    'productos_menos_vendidos',
                    'resumen_diario',
                    'ventas',
                ],
            ]);

        $response = $this->getJson(
            '/api/reportes-ventas?periodo=anio&referencia=2026-06-11'
        )->assertOk();

        $this->assertLessThanOrEqual(
            10,
            count($response->json('data.productos_vendidos'))
        );
        $this->assertLessThanOrEqual(
            10,
            count($response->json('data.productos_menos_vendidos'))
        );

        $this->getJson(
            '/api/reportes-ventas?periodo=rango&fecha_inicio=2026-06-10&fecha_fin=2026-06-11'
        )
            ->assertOk()
            ->assertJsonPath('data.fecha_inicio', '2026-06-10')
            ->assertJsonPath('data.fecha_fin', '2026-06-11');
    }
}
