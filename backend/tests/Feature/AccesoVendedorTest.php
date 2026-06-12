<?php

namespace Tests\Feature;

use App\Models\Usuario;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AccesoVendedorTest extends TestCase
{
    public function test_vendedor_accede_a_ventas_pero_no_a_administracion(): void
    {
        $vendedor = Usuario::whereHas(
            'role',
            fn ($query) => $query->where('nombre', 'Vendedor')
        )->first();

        if (!$vendedor) {
            $this->markTestSkipped('Se necesita un usuario Vendedor.');
        }

        Sanctum::actingAs($vendedor);

        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonPath('data.perfil', 'vendedor')
            ->assertJsonPath('data.ganancia_total', 0)
            ->assertJsonPath('data.total_compras', 0);

        $this->getJson('/api/ventas')->assertOk();
        $this->getJson('/api/productos')->assertOk();
        $this->getJson('/api/reportes-ventas')->assertForbidden();
        $this->getJson('/api/compras')->assertForbidden();
        $this->getJson('/api/stocks')->assertForbidden();
        $this->getJson('/api/usuarios')->assertForbidden();
        $this->postJson('/api/productos', [])->assertForbidden();
    }
}
