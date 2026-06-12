<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerificarRol
{
    public function handle(
        Request $request,
        Closure $next,
        string ...$roles
    ): Response {
        $usuario = $request->user();
        $rol = $usuario?->role?->nombre;

        if (!$usuario || !in_array($rol, $roles, true)) {
            return response()->json([
                'success' => false,
                'message' => 'No tienes permiso para realizar esta acción.',
            ], 403);
        }

        return $next($request);
    }
}
