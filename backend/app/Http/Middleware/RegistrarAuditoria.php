<?php

namespace App\Http\Middleware;

use App\Models\Auditoria;
use App\Models\Usuario;
use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class RegistrarAuditoria
{
    private const MODULOS_AUDITABLES = [
        'productos',
        'stocks',
        'categorias',
        'marcas',
        'materiales',
        'tallas',
        'colores',
        'clientes',
        'usuarios',
        'proveedores',
        'compras',
        'ventas',
        'comprobantes',
        'carritos',
        'carrito-detalles',
        'compra-detalles',
        'venta-detalles',
        'mi-carrito',
        'mi-compra',
        'mi-cuenta',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (!$this->debeRegistrar($request, $response)) {
            return $response;
        }

        try {
            $usuario = $this->resolverUsuario($request);

            if (!$usuario) {
                return $response;
            }

            $segmentos = $request->segments();
            $modulo = $segmentos[1] ?? null;
            $contenido = json_decode($response->getContent(), true);

            Auditoria::create([
                'usuarios_id' => $usuario->id,
                'accion' => $this->resolverAccion($request, $segmentos),
                'tabla_afectada' => $modulo,
                'registro_id' => $this->resolverRegistroId(
                    $request,
                    $contenido
                ),
                'descripcion' => $contenido['message']
                    ?? $this->descripcionPredeterminada($request, $modulo),
                'ip' => $request->ip(),
                'fecha' => now(),
            ]);
        } catch (\Throwable $error) {
            report($error);
        }

        return $response;
    }

    private function debeRegistrar(
        Request $request,
        Response $response
    ): bool {
        if (!in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            return false;
        }

        if ($response->getStatusCode() >= 400) {
            return false;
        }

        $modulo = $request->segments()[1] ?? null;

        return in_array($modulo, self::MODULOS_AUDITABLES, true);
    }

    private function resolverUsuario(Request $request): ?Usuario
    {
        $usuario = $request->user('sanctum');

        if ($usuario instanceof Usuario) {
            return $usuario;
        }

        if ($request->bearerToken()) {
            $token = PersonalAccessToken::findToken($request->bearerToken());

            if ($token?->tokenable instanceof Usuario) {
                return $token->tokenable;
            }
        }

        $usuarioId = $request->input('usuarios_id');

        return $usuarioId ? Usuario::find($usuarioId) : null;
    }

    private function resolverAccion(
        Request $request,
        array $segmentos
    ): string {
        $ruta = implode('/', array_slice($segmentos, 1));

        return match (true) {
            str_contains($ruta, 'incrementar') => 'Aumentar stock',
            str_contains($ruta, '/pagos') => 'Registrar pago',
            str_contains($ruta, 'finalizar') => 'Finalizar compra',
            $request->isMethod('post') => 'Crear',
            in_array($request->method(), ['PUT', 'PATCH'], true) => 'Actualizar',
            $request->isMethod('delete') => 'Eliminar',
            default => 'Modificar',
        };
    }

    private function resolverRegistroId(
        Request $request,
        ?array $contenido
    ): ?string {
        $idRespuesta = data_get($contenido, 'data.id');

        if ($idRespuesta !== null) {
            return (string) $idRespuesta;
        }

        foreach ($request->route()?->parameters() ?? [] as $valor) {
            if (is_scalar($valor)) {
                return (string) $valor;
            }
        }

        return null;
    }

    private function descripcionPredeterminada(
        Request $request,
        ?string $modulo
    ): string {
        return sprintf(
            '%s realizada en %s.',
            $request->method(),
            $modulo ?: 'el sistema'
        );
    }
}
