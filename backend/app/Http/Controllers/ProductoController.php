<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductoController extends Controller
{
    /**
     * Listar todos los productos.
     */
    public function index()
    {
        $productos = Producto::with(['categoria', 'marca', 'stocks.talla', 'stocks.color'])
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de productos obtenida correctamente',
            'data' => $productos
        ], 200);
    }

    /**
     * Registrar un nuevo producto.
     */
    public function store(Request $request)
    {
        $request->validate([
            'categorias_id' => [
                'required',
                'exists:categorias,id'
            ],

            'marcas_id' => [
                'nullable',
                'exists:marcas,id'
            ],

            'nombre' => [
                'required',
                'string',
                'max:150',
                'unique:productos,nombre'
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:500'
            ],

            'precio' => [
                'required',
                'numeric',
                'min:0'
            ],

            'imagen' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048'
            ],

            'codigo' => [
                'nullable',
                'string',
                'max:50',
                'unique:productos,codigo'
            ],

            'estado' => [
                'nullable',
                'boolean'
            ],
        ], [
            'categorias_id.required' => 'La categoría es obligatoria.',
            'categorias_id.exists' => 'La categoría seleccionada no existe.',

            'marcas_id.exists' => 'La marca seleccionada no existe.',

            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.string' => 'El nombre del producto debe ser texto.',
            'nombre.max' => 'El nombre del producto no debe superar los 150 caracteres.',
            'nombre.unique' => 'Este producto ya se encuentra registrado.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 500 caracteres.',

            'precio.required' => 'El precio es obligatorio.',
            'precio.numeric' => 'El precio debe ser un número.',
            'precio.min' => 'El precio no puede ser negativo.',

            'imagen.image' => 'El archivo debe ser una imagen.',
            'imagen.mimes' => 'La imagen debe ser de tipo jpg, jpeg, png o webp.',
            'imagen.max' => 'La imagen no debe superar los 2 MB.',

            'codigo.string' => 'El código debe ser texto.',
            'codigo.max' => 'El código no debe superar los 50 caracteres.',
            'codigo.unique' => 'Este código ya está registrado.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        $rutaImagen = null;

        if ($request->hasFile('imagen')) {
            $archivo = $request->file('imagen');
            $nombreImagen = time() . '_' . $archivo->getClientOriginalName();
            $rutaImagen = $archivo->storeAs('productos', $nombreImagen, 'public');
        }

        $producto = Producto::create([
            'categorias_id' => $request->categorias_id,
            'marcas_id' => $request->marcas_id,
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
            'precio' => $request->precio,
            'imagen' => $rutaImagen,
            'codigo' => $request->codigo ? trim($request->codigo) : null,
            'estado' => $request->estado ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Producto registrado correctamente',
            'data' => $producto->load(['categoria', 'marca'])
        ], 201);
    }

    /**
     * Mostrar un producto específico.
     */
    public function show($id)
    {
        $producto = Producto::with(['categoria', 'marca', 'stocks.talla', 'stocks.color'])
            ->find($id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Producto encontrado correctamente',
            'data' => $producto
        ], 200);
    }

    /**
     * Actualizar un producto.
     */
    public function update(Request $request, $id)
    {
        $producto = Producto::find($id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        $request->validate([
            'categorias_id' => [
                'required',
                'exists:categorias,id'
            ],

            'marcas_id' => [
                'nullable',
                'exists:marcas,id'
            ],

            'nombre' => [
                'required',
                'string',
                'max:150',
                Rule::unique('productos', 'nombre')->ignore($producto->id)
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:500'
            ],

            'precio' => [
                'required',
                'numeric',
                'min:0'
            ],

            'imagen' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048'
            ],

            'codigo' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('productos', 'codigo')->ignore($producto->id)
            ],

            'estado' => [
                'nullable',
                'boolean'
            ],
        ], [
            'categorias_id.required' => 'La categoría es obligatoria.',
            'categorias_id.exists' => 'La categoría seleccionada no existe.',

            'marcas_id.exists' => 'La marca seleccionada no existe.',

            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.string' => 'El nombre del producto debe ser texto.',
            'nombre.max' => 'El nombre del producto no debe superar los 150 caracteres.',
            'nombre.unique' => 'Este producto ya se encuentra registrado.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 500 caracteres.',

            'precio.required' => 'El precio es obligatorio.',
            'precio.numeric' => 'El precio debe ser un número.',
            'precio.min' => 'El precio no puede ser negativo.',

            'imagen.image' => 'El archivo debe ser una imagen.',
            'imagen.mimes' => 'La imagen debe ser de tipo jpg, jpeg, png o webp.',
            'imagen.max' => 'La imagen no debe superar los 2 MB.',

            'codigo.string' => 'El código debe ser texto.',
            'codigo.max' => 'El código no debe superar los 50 caracteres.',
            'codigo.unique' => 'Este código ya está registrado.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ]);

        $rutaImagen = $producto->imagen;

        if ($request->hasFile('imagen')) {
            $archivo = $request->file('imagen');
            $nombreImagen = time() . '_' . $archivo->getClientOriginalName();
            $rutaImagen = $archivo->storeAs('productos', $nombreImagen, 'public');
        }

        $producto->update([
            'categorias_id' => $request->categorias_id,
            'marcas_id' => $request->marcas_id,
            'nombre' => trim($request->nombre),
            'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
            'precio' => $request->precio,
            'imagen' => $rutaImagen,
            'codigo' => $request->codigo ? trim($request->codigo) : null,
            'estado' => $request->estado ?? true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado correctamente',
            'data' => $producto->load(['categoria', 'marca'])
        ], 200);
    }

    /**
     * Eliminar un producto.
     */
    public function destroy($id)
    {
        $producto = Producto::withCount([
            'stocks',
            'compraDetalles'
        ])->find($id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        if ($producto->stocks_count > 0 || $producto->compra_detalles_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el producto porque tiene stock o registros asociados'
            ], 409);
        }

        $producto->delete();

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado correctamente'
        ], 200);
    }
}