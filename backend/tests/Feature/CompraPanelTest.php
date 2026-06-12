<?php

namespace Tests\Feature;

use App\Models\Proveedor;
use App\Models\Stock;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompraPanelTest extends TestCase
{
    use DatabaseTransactions;

    public function test_purchase_updates_stock_and_can_be_cancelled(): void
    {
        $proveedor = Proveedor::first();
        $stock = Stock::first();
        $usuario = Usuario::whereHas(
            'role',
            fn ($query) => $query->where('nombre', 'Administrador')
        )->first();

        if (!$proveedor || !$stock || !$usuario) {
            $this->markTestSkipped(
                'Se necesita proveedor, stock y usuario para probar compras.'
            );
        }

        Sanctum::actingAs($usuario);
        $cantidadInicial = $stock->cantidad;

        $response = $this->postJson('/api/compras', [
            'proveedores_id' => $proveedor->id,
            'usuarios_id' => $usuario->id,
            'fecha' => now()->toDateString(),
            'numero_documento' => 'TEST-COMPRA',
            'pago_inicial' => 0,
            'metodo_pago' => 'efectivo',
            'detalles' => [
                [
                    'productos_id' => $stock->productos_id,
                    'stocks_id' => $stock->id,
                    'cantidad' => 2,
                    'precio' => 20,
                ],
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.total', 40)
            ->assertJsonPath('data.estado_pago', 'pendiente');

        $this->assertSame(
            $cantidadInicial + 2,
            $stock->fresh()->cantidad
        );

        $this->deleteJson('/api/compras/' . $response->json('data.id'))
            ->assertOk();

        $this->assertSame($cantidadInicial, $stock->fresh()->cantidad);
    }
}
