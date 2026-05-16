<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Productos;

class ProductoController extends Controller
{
    public function listar()
    {
        $dataset = Productos::all();
        return response()->json($dataset, 200);
    }

    public function store(Request $request)
    {
        $producto = new Productos();

        $producto->nombre = $request->nombre;
        $producto->precio = $request->precio;
        $producto->imagen = 'sin imagen';

        $producto->save();

        return response()->json($producto, 201);
    }

    // MOSTRAR UN PRODUCTO
    public function show($id)
    {
        $producto = Productos::find($id);

        return response()->json($producto, 200);
    }

    // ACTUALIZAR PRODUCTO
    public function update(Request $request, $id)
    {
        $producto = Productos::find($id);

        $producto->nombre = $request->nombre;
        $producto->precio = $request->precio;
        $producto->imagen = 'sin imagen';

        $producto->save();

        return response()->json($producto, 200);
    }

    public function eliminar($id)
    {
        $dato = Productos::find($id);

        $dato->delete();

        return response()->json([
            "mensaje" => "Producto eliminado"
        ], 200);
    }
}