<?php

namespace Tests\Feature;

use App\Models\Auditoria;
use App\Models\Usuario;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AuditoriaAutomaticaTest extends TestCase
{
    use DatabaseTransactions;

    public function test_creating_a_record_generates_an_audit_event(): void
    {
        $usuario = Usuario::whereHas(
            'role',
            fn ($query) => $query->where('nombre', 'Administrador')
        )->first();

        if (!$usuario) {
            $this->markTestSkipped(
                'Se necesita un usuario para probar la auditoría.'
            );
        }

        $token = $usuario->createToken('auditoria-test')->plainTextToken;
        $nombre = 'Categoria auditoria ' . uniqid();

        $response = $this
            ->withToken($token)
            ->postJson('/api/categorias', [
                'nombre' => $nombre,
                'descripcion' => 'Registro temporal de prueba',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('auditorias', [
            'usuarios_id' => $usuario->id,
            'accion' => 'Crear',
            'tabla_afectada' => 'categorias',
            'registro_id' => (string) $response->json('data.id'),
        ]);

        $auditoria = Auditoria::latest('id')->first();

        $this->assertNotNull($auditoria?->descripcion);
        $this->assertNotNull($auditoria?->ip);
    }
}
