<?php

namespace App\Http\Controllers;

use App\Models\Producto;
use App\Models\Stock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductoController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'materiales_id' => ['nullable', 'integer', 'exists:materiales,id'],
            'genero' => ['nullable', 'string', 'in:Hombre,Mujer,Unisex'],
            'buscar' => ['nullable', 'string', 'max:150'],
        ]);

        $productos = Producto::with([
                'categoria',
                'marca',
                'material',
                'stocks.talla',
                'stocks.color'
            ])
            ->when($request->filled('materiales_id'), function ($query) use ($request) {
                $query->where('materiales_id', $request->materiales_id);
            })
            ->when($request->filled('genero'), function ($query) use ($request) {
                $query->where('genero', $request->genero);
            })
            ->when($request->filled('buscar'), function ($query) use ($request) {
                $texto = trim($request->buscar);

                $query->where(function ($subquery) use ($texto) {
                    $subquery
                        ->where('nombre', 'like', "%{$texto}%")
                        ->orWhere('descripcion', 'like', "%{$texto}%");
                });
            })
            ->orderBy('id', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Lista de productos obtenida correctamente',
            'data' => $productos
        ], 200);
    }

    public function store(Request $request)
    {
        if (is_string($request->stocks)) {
            $request->merge([
                'stocks' => json_decode($request->stocks, true),
            ]);
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

            'materiales_id' => [
                'nullable',
                'exists:materiales,id'
            ],

            'genero' => [
                'nullable',
                'string',
                'in:Hombre,Mujer,Unisex'
            ],

            'nombre' => [
                'required',
                'string',
                'max:150'
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:500'
            ],

            'imagen' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048'
            ],

            'estado' => [
                'nullable',
                'boolean'
            ],

            'stocks' => [
                'nullable',
                'array',
                'min:1'
            ],

            'stocks.*.tallas_id' => [
                'nullable',
                'exists:tallas,id'
            ],

            'stocks.*.colores_id' => [
                'nullable',
                'exists:colores,id'
            ],

            'stocks.*.precio' => [
                'required_with:stocks',
                'numeric',
                'min:0'
            ],

            'stocks.*.cantidad' => [
                'required_with:stocks',
                'integer',
                'min:0'
            ],

            'stocks.*.stock_minimo' => [
                'nullable',
                'integer',
                'min:0'
            ],
        ], [
            'categorias_id.required' => 'La categoría es obligatoria.',
            'categorias_id.exists' => 'La categoría seleccionada no existe.',

            'marcas_id.exists' => 'La marca seleccionada no existe.',
            'materiales_id.exists' => 'El material seleccionado no existe.',
            'genero.in' => 'El género debe ser Hombre, Mujer o Unisex.',

            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.string' => 'El nombre del producto debe ser texto.',
            'nombre.max' => 'El nombre del producto no debe superar los 150 caracteres.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 500 caracteres.',

            'imagen.image' => 'El archivo debe ser una imagen.',
            'imagen.mimes' => 'La imagen debe ser de tipo jpg, jpeg, png o webp.',
            'imagen.max' => 'La imagen no debe superar los 2 MB.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',

            'stocks.min' => 'Agrega al menos una variante de stock.',
            'stocks.*.tallas_id.exists' => 'Una de las tallas seleccionadas no existe.',
            'stocks.*.colores_id.exists' => 'Uno de los colores seleccionados no existe.',
            'stocks.*.precio.required_with' => 'El precio es obligatorio en cada variante.',
            'stocks.*.precio.numeric' => 'El precio de cada variante debe ser un número.',
            'stocks.*.precio.min' => 'El precio no puede ser negativo.',
            'stocks.*.cantidad.required_with' => 'La cantidad es obligatoria en cada variante.',
            'stocks.*.cantidad.integer' => 'La cantidad debe ser un número entero.',
            'stocks.*.cantidad.min' => 'La cantidad no puede ser negativa.',
            'stocks.*.stock_minimo.integer' => 'El stock mínimo debe ser un número entero.',
            'stocks.*.stock_minimo.min' => 'El stock mínimo no puede ser negativo.',
        ]);

        $variantes = collect($request->input('stocks', []));
        $combinaciones = $variantes->map(
            fn ($stock) => ($stock['tallas_id'] ?? 'sin-talla') . '-' .
                ($stock['colores_id'] ?? 'sin-color')
        );

        if ($combinaciones->duplicates()->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes repetir la misma combinación de talla y color.'
            ], 422);
        }

        $rutaImagen = null;

        if ($request->hasFile('imagen')) {
            $archivo = $request->file('imagen');
            $nombreImagen = time() . '_' . $archivo->getClientOriginalName();
            $rutaImagen = $archivo->storeAs('productos', $nombreImagen, 'public');
        }

        $producto = DB::transaction(function () use ($request, $rutaImagen, $variantes) {
            $producto = Producto::create([
                'categorias_id' => $request->categorias_id,
                'marcas_id' => $request->marcas_id,
                'materiales_id' => $request->materiales_id,
                'nombre' => trim($request->nombre),
                'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
                'imagen' => $rutaImagen,
                'estado' => $request->estado ?? true,
                'genero' => $request->genero,
            ]);

            foreach ($variantes as $variante) {
                Stock::create([
                    'productos_id' => $producto->id,
                    'tallas_id' => $variante['tallas_id'] ?: null,
                    'colores_id' => $variante['colores_id'] ?: null,
                    'precio' => $variante['precio'],
                    'cantidad' => $variante['cantidad'],
                    'stock_minimo' => $variante['stock_minimo'] ?? 5,
                ]);
            }

            return $producto;
        });

        return response()->json([
            'success' => true,
            'message' => 'Producto registrado correctamente',
            'data' => $producto->load(['categoria', 'marca', 'material', 'stocks.talla', 'stocks.color'])
        ], 201);
    }

    public function show($id)
    {
        $producto = Producto::with([
                'categoria',
                'marca',
                'material',
                'stocks.talla',
                'stocks.color'
            ])
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

    public function update(Request $request, $id)
    {
        $producto = Producto::find($id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        if (is_string($request->stocks)) {
            $request->merge([
                'stocks' => json_decode($request->stocks, true),
            ]);
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

            'materiales_id' => [
                'nullable',
                'exists:materiales,id'
            ],

            'genero' => [
                'nullable',
                'string',
                'in:Hombre,Mujer,Unisex'
            ],

            'nombre' => [
                'required',
                'string',
                'max:150'
            ],

            'descripcion' => [
                'nullable',
                'string',
                'max:500'
            ],

            'imagen' => [
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048'
            ],

            'estado' => [
                'nullable',
                'boolean'
            ],

            'stocks' => [
                'nullable',
                'array',
                'min:1'
            ],

            'stocks.*.id' => [
                'nullable',
                'integer',
                'exists:stocks,id'
            ],

            'stocks.*.tallas_id' => [
                'nullable',
                'exists:tallas,id'
            ],

            'stocks.*.colores_id' => [
                'nullable',
                'exists:colores,id'
            ],

            'stocks.*.precio' => [
                'required_with:stocks',
                'numeric',
                'min:0'
            ],

            'stocks.*.cantidad' => [
                'required_with:stocks',
                'integer',
                'min:0'
            ],

            'stocks.*.stock_minimo' => [
                'nullable',
                'integer',
                'min:0'
            ],
        ], [
            'categorias_id.required' => 'La categoría es obligatoria.',
            'categorias_id.exists' => 'La categoría seleccionada no existe.',

            'marcas_id.exists' => 'La marca seleccionada no existe.',
            'materiales_id.exists' => 'El material seleccionado no existe.',
            'genero.in' => 'El género debe ser Hombre, Mujer o Unisex.',

            'nombre.required' => 'El nombre del producto es obligatorio.',
            'nombre.string' => 'El nombre del producto debe ser texto.',
            'nombre.max' => 'El nombre del producto no debe superar los 150 caracteres.',

            'descripcion.string' => 'La descripción debe ser texto.',
            'descripcion.max' => 'La descripción no debe superar los 500 caracteres.',

            'imagen.image' => 'El archivo debe ser una imagen.',
            'imagen.mimes' => 'La imagen debe ser de tipo jpg, jpeg, png o webp.',
            'imagen.max' => 'La imagen no debe superar los 2 MB.',

            'estado.boolean' => 'El estado debe ser verdadero o falso.',

            'stocks.min' => 'Agrega al menos una variante de stock.',
            'stocks.*.id.exists' => 'Una de las variantes ya no existe.',
            'stocks.*.tallas_id.exists' => 'Una de las tallas seleccionadas no existe.',
            'stocks.*.colores_id.exists' => 'Uno de los colores seleccionados no existe.',
            'stocks.*.precio.required_with' => 'El precio es obligatorio en cada variante.',
            'stocks.*.precio.numeric' => 'El precio de cada variante debe ser un número.',
            'stocks.*.precio.min' => 'El precio no puede ser negativo.',
            'stocks.*.cantidad.required_with' => 'La cantidad es obligatoria en cada variante.',
            'stocks.*.cantidad.integer' => 'La cantidad debe ser un número entero.',
            'stocks.*.cantidad.min' => 'La cantidad no puede ser negativa.',
            'stocks.*.stock_minimo.integer' => 'El stock mínimo debe ser un número entero.',
            'stocks.*.stock_minimo.min' => 'El stock mínimo no puede ser negativo.',
        ]);

        $variantes = collect($request->input('stocks', []));
        $combinaciones = $variantes->map(
            fn ($stock) => ($stock['tallas_id'] ?? 'sin-talla') . '-' .
                ($stock['colores_id'] ?? 'sin-color')
        );

        if ($combinaciones->duplicates()->isNotEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'No puedes repetir la misma combinación de talla y color.'
            ], 422);
        }

        $idsRecibidos = $variantes->pluck('id')->filter()->values();
        $idsAjenos = Stock::whereIn('id', $idsRecibidos)
            ->where('productos_id', '!=', $producto->id)
            ->exists();

        if ($idsAjenos) {
            return response()->json([
                'success' => false,
                'message' => 'Una variante no pertenece al producto seleccionado.'
            ], 422);
        }

        $stocksAEliminar = $request->has('stocks')
            ? $producto->stocks()->whereNotIn('id', $idsRecibidos)->get()
            : collect();

        foreach ($stocksAEliminar as $stock) {
            if ($stock->ventaDetalles()->exists() || $stock->carritoDetalles()->exists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No se puede eliminar una variante usada en ventas o carritos.'
                ], 409);
            }
        }

        $rutaImagen = $producto->imagen;

        if ($request->hasFile('imagen')) {
            $archivo = $request->file('imagen');
            $nombreImagen = time() . '_' . $archivo->getClientOriginalName();
            $rutaImagen = $archivo->storeAs('productos', $nombreImagen, 'public');
        }

        DB::transaction(function () use (
            $request,
            $producto,
            $rutaImagen,
            $variantes,
            $stocksAEliminar
        ) {
            $producto->update([
                'categorias_id' => $request->categorias_id,
                'marcas_id' => $request->marcas_id,
                'materiales_id' => $request->materiales_id,
                'nombre' => trim($request->nombre),
                'descripcion' => $request->descripcion ? trim($request->descripcion) : null,
                'imagen' => $rutaImagen,
                'estado' => $request->estado ?? true,
                'genero' => $request->genero,
            ]);

            foreach ($variantes as $variante) {
                $datosStock = [
                    'productos_id' => $producto->id,
                    'tallas_id' => $variante['tallas_id'] ?: null,
                    'colores_id' => $variante['colores_id'] ?: null,
                    'precio' => $variante['precio'],
                    'cantidad' => $variante['cantidad'],
                    'stock_minimo' => $variante['stock_minimo'] ?? 5,
                ];

                if (!empty($variante['id'])) {
                    Stock::where('id', $variante['id'])->update($datosStock);
                } else {
                    Stock::create($datosStock);
                }
            }

            foreach ($stocksAEliminar as $stock) {
                $stock->delete();
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Producto actualizado correctamente',
            'data' => $producto->load(['categoria', 'marca', 'material', 'stocks.talla', 'stocks.color'])
        ], 200);
    }

    public function destroy($id)
    {
        $producto = Producto::with([
            'stocks.ventaDetalles',
            'stocks.carritoDetalles'
        ])->withCount('compraDetalles')->find($id);

        if (!$producto) {
            return response()->json([
                'success' => false,
                'message' => 'Producto no encontrado'
            ], 404);
        }

        if ($producto->compra_detalles_count > 0) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el producto porque tiene compras asociadas.'
            ], 409);
        }

        $stockEnUso = $producto->stocks->contains(
            fn ($stock) =>
                $stock->ventaDetalles->isNotEmpty() ||
                $stock->carritoDetalles->isNotEmpty()
        );

        if ($stockEnUso) {
            return response()->json([
                'success' => false,
                'message' => 'No se puede eliminar el producto porque fue usado en ventas o carritos.'
            ], 409);
        }

        DB::transaction(function () use ($producto) {
            $producto->stocks()->delete();
            $producto->delete();
        });

        return response()->json([
            'success' => true,
            'message' => 'Producto eliminado correctamente'
        ], 200);
    }
}
