<?php

namespace Tests\Feature;

use App\Models\Stock;
use App\Models\Usuario;
use App\Models\Cliente;
use App\Models\Persona;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VentaPanelTest extends TestCase
{
    use DatabaseTransactions;

    public function test_panel_sale_creates_receipt_and_updates_stock(): void
    {
        $stock = Stock::where('cantidad', '>', 0)->first();
        $usuario = Usuario::whereHas(
            'role',
            fn ($query) => $query->whereIn(
                'nombre',
                ['Vendedor', 'Administrador']
            )
        )->first();

        if (!$stock || !$usuario) {
            $this->markTestSkipped('Se necesita un usuario y stock disponible.');
        }

        Sanctum::actingAs($usuario);
        $cantidadInicial = $stock->cantidad;
        $montoRecibido = (float) $stock->precio + 10;
        $personasIniciales = Persona::count();
        $clientesIniciales = Cliente::count();

        $response = $this->postJson('/api/ventas', [
            'clientes_id' => null,
            'usuarios_id' => $usuario->id,
            'fecha' => now()->toISOString(),
            'metodo_pago' => 'efectivo',
            'monto_recibido' => $montoRecibido,
            'detalles' => [
                [
                    'stocks_id' => $stock->id,
                    'cantidad' => 1,
                ],
            ],
            'comprobante' => [
                'tipo' => 'boleta',
            ],
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('data.clientes_id', null)
            ->assertJsonPath('data.comprobante.tipo', 'boleta');

        $this->assertSame(
            (float) $stock->precio,
            (float) $response->json('data.total')
        );
        $this->assertSame(10.0, (float) $response->json('data.vuelto'));
        $this->assertStringStartsWith(
            'B001-',
            $response->json('data.comprobante.numero')
        );
        $this->assertSame(
            $cantidadInicial - 1,
            $stock->fresh()->cantidad
        );
        $this->assertSame($personasIniciales, Persona::count());
        $this->assertSame($clientesIniciales, Cliente::count());
    }
}
