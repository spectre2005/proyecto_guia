<?php

namespace App\Http\Controllers;

use App\Models\Auditoria;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    /**
     * Listar todas las auditorías.
     */
    public function index()
    {
        $auditorias = Auditoria::with('usuario.persona')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de auditorías obtenida correctamente',
            'data' => $auditorias
        ], 200);
    }

    /**
     * Registrar una auditoría.
     */
    public function store(Request $request)
    {
        $request->validate([
            'usuarios_id' => 'required|exists:usuarios,id',
            'accion' => 'required|string|max:255',
            'tabla_afectada' => 'nullable|string|max:100',
            'fecha' => 'nullable|date',
        ], [
            'usuarios_id.required' => 'El usuario es obligatorio.',
            'usuarios_id.exists' => 'El usuario seleccionado no existe.',
            'accion.required' => 'La acción es obligatoria.',
            'accion.string' => 'La acción debe ser texto.',
            'accion.max' => 'La acción no debe superar los 255 caracteres.',
            'tabla_afectada.string' => 'La tabla afectada debe ser texto.',
            'tabla_afectada.max' => 'La tabla afectada no debe superar los 100 caracteres.',
            'fecha.date' => 'La fecha no es válida.',
        ]);

        $auditoria = Auditoria::create([
            'usuarios_id' => $request->usuarios_id,
            'accion' => trim($request->accion),
            'tabla_afectada' => $request->tabla_afectada
                ? trim($request->tabla_afectada)
                : null,
            'fecha' => $request->fecha ?? now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Auditoría registrada correctamente',
            'data' => $auditoria->load('usuario.persona')
        ], 201);
    }

    /**
     * Mostrar una auditoría específica.
     */
    public function show($id)
    {
        $auditoria = Auditoria::with('usuario.persona')->find($id);

        if (!$auditoria) {
            return response()->json([
                'success' => false,
                'message' => 'Auditoría no encontrada'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Auditoría encontrada correctamente',
            'data' => $auditoria
        ], 200);
    }

    /**
     * Actualizar una auditoría.
     */
    public function update(Request $request, $id)
    {
        $auditoria = Auditoria::find($id);

        if (!$auditoria) {
            return response()->json([
                'success' => false,
                'message' => 'Auditoría no encontrada'
            ], 404);
        }

        $request->validate([
            'usuarios_id' => 'required|exists:usuarios,id',
            'accion' => 'required|string|max:255',
            'tabla_afectada' => 'nullable|string|max:100',
            'fecha' => 'nullable|date',
        ]);

        $auditoria->update([
            'usuarios_id' => $request->usuarios_id,
            'accion' => trim($request->accion),
            'tabla_afectada' => $request->tabla_afectada
                ? trim($request->tabla_afectada)
                : null,
            'fecha' => $request->fecha ?? $auditoria->fecha,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Auditoría actualizada correctamente',
            'data' => $auditoria->load('usuario.persona')
        ], 200);
    }

    /**
     * Eliminar una auditoría.
     */
    public function destroy($id)
    {
        $auditoria = Auditoria::find($id);

        if (!$auditoria) {
            return response()->json([
                'success' => false,
                'message' => 'Auditoría no encontrada'
            ], 404);
        }

        $auditoria->delete();

        return response()->json([
            'success' => true,
            'message' => 'Auditoría eliminada correctamente'
        ], 200);
    }

    /**
     * Buscar auditorías por usuario.
     */
    public function porUsuario($usuarios_id)
    {
        $auditorias = Auditoria::with('usuario.persona')
            ->where('usuarios_id', $usuarios_id)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Auditorías del usuario obtenidas correctamente',
            'data' => $auditorias
        ], 200);
    }

    /**
     * Buscar auditorías por tabla afectada.
     */
    public function porTabla($tabla)
    {
        $auditorias = Auditoria::with('usuario.persona')
            ->where('tabla_afectada', $tabla)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Auditorías de la tabla obtenidas correctamente',
            'data' => $auditorias
        ], 200);
    }
}