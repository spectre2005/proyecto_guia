import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const formularioProductoVacio = {
    categorias_id: "",
    marcas_id: "",
    materiales_id: "",
    genero: "",
    nombre: "",
    descripcion: "",
    estado: 1,
    imagen: null,
};

const formularioVarianteVacio = {
    tallas_id: "",
    colores_id: "",
    precio: "",
    cantidad: "",
    stock_minimo: "5",
};

const ProductosPanel = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [marcas, setMarcas] = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [tallas, setTallas] = useState([]);
    const [colores, setColores] = useState([]);

    const [modal, setModal] = useState(false);
    const [productoEditando, setProductoEditando] = useState(null);
    const [form, setForm] = useState(formularioProductoVacio);
    const [varianteForm, setVarianteForm] = useState(
        formularioVarianteVacio
    );
    const [variantes, setVariantes] = useState([]);
    const [productosPendientes, setProductosPendientes] = useState([]);
    const [mensajeModal, setMensajeModal] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [archivoKey, setArchivoKey] = useState(0);
    const [modalStock, setModalStock] = useState(null);
    const [stockSeleccionado, setStockSeleccionado] = useState("");
    const [cantidadAgregar, setCantidadAgregar] = useState("");
    const [mensajeStock, setMensajeStock] = useState("");
    const [sumandoStock, setSumandoStock] = useState(false);

    const obtenerDatos = async () => {
        try {
            const [prod, cat, mar, mat, tal, col] = await Promise.all([
                clienteAxios.get("/productos"),
                clienteAxios.get("/categorias"),
                clienteAxios.get("/marcas"),
                clienteAxios.get("/materiales"),
                clienteAxios.get("/tallas"),
                clienteAxios.get("/colores"),
            ]);

            setProductos(Array.isArray(prod.data) ? prod.data : prod.data.data || []);
            setCategorias(Array.isArray(cat.data) ? cat.data : cat.data.data || []);
            setMarcas(Array.isArray(mar.data) ? mar.data : mar.data.data || []);
            setMateriales(Array.isArray(mat.data) ? mat.data : mat.data.data || []);
            setTallas(Array.isArray(tal.data) ? tal.data : tal.data.data || []);
            setColores(Array.isArray(col.data) ? col.data : col.data.data || []);
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const temporizador = setTimeout(() => {
            obtenerDatos();
        }, 0);

        return () => clearTimeout(temporizador);
    }, []);

    const reiniciarFormulario = () => {
        setForm({ ...formularioProductoVacio });
        setVarianteForm({ ...formularioVarianteVacio });
        setVariantes([]);
        setProductosPendientes([]);
        setArchivoKey((actual) => actual + 1);
    };

    const abrirNuevo = () => {
        setProductoEditando(null);
        reiniciarFormulario();
        setMensajeModal("");
        setModal(true);
    };

    const abrirEditar = (producto) => {
        setProductoEditando(producto);
        setForm({
            categorias_id: producto.categorias_id || "",
            marcas_id: producto.marcas_id || "",
            materiales_id: producto.materiales_id || "",
            genero: producto.genero || "",
            nombre: producto.nombre || "",
            descripcion: producto.descripcion || "",
            estado: producto.estado ? 1 : 0,
            imagen: null,
        });
        setVariantes(
            (producto.stocks || []).map((stock) => ({
                id: stock.id,
                clave: `stock-${stock.id}`,
                tallas_id: String(stock.tallas_id || ""),
                colores_id: String(stock.colores_id || ""),
                precio: String(stock.precio ?? ""),
                cantidad: String(stock.cantidad ?? ""),
                stock_minimo: String(stock.stock_minimo ?? 5),
                codigo: stock.codigo,
            }))
        );
        setVarianteForm({ ...formularioVarianteVacio });
        setProductosPendientes([]);
        setMensajeModal("");
        setModal(true);
    };

    const obtenerNombre = (lista, id) =>
        lista.find((item) => String(item.id) === String(id))?.nombre || "-";

    const validarProductoActual = () => {
        if (
            !form.categorias_id ||
            !form.marcas_id ||
            !form.materiales_id ||
            !form.genero ||
            !form.nombre.trim() ||
            !form.descripcion.trim()
        ) {
            return "Completa los datos generales del producto.";
        }

        if (
            !varianteForm.tallas_id ||
            !varianteForm.colores_id ||
            varianteForm.precio === "" ||
            varianteForm.cantidad === "" ||
            varianteForm.stock_minimo === ""
        ) {
            return "Completa talla, color, precio, cantidad y stock mínimo.";
        }

        return "";
    };

    const agregarProductoPendiente = () => {
        const error = validarProductoActual();

        if (error) {
            setMensajeModal(error);
            return;
        }

        setProductosPendientes((actuales) => [
            ...actuales,
            {
                clave: `producto-${Date.now()}-${Math.random()}`,
                producto: { ...form },
                stock: { ...varianteForm },
            },
        ]);

        setMensajeModal("");
    };

    const quitarProductoPendiente = (clave) => {
        setProductosPendientes((actuales) =>
            actuales.filter((item) => item.clave !== clave)
        );
    };

    const agregarVariante = () => {
        if (
            !varianteForm.tallas_id ||
            !varianteForm.colores_id ||
            varianteForm.precio === "" ||
            varianteForm.cantidad === "" ||
            varianteForm.stock_minimo === ""
        ) {
            setMensajeModal(
                "Completa talla, color, precio, cantidad y stock mínimo."
            );
            return;
        }

        const repetida = variantes.some(
            (variante) =>
                String(variante.tallas_id) ===
                    String(varianteForm.tallas_id) &&
                String(variante.colores_id) ===
                    String(varianteForm.colores_id)
        );

        if (repetida) {
            setMensajeModal(
                "Esa combinación de talla y color ya está agregada."
            );
            return;
        }

        setVariantes((actuales) => [
            ...actuales,
            {
                ...varianteForm,
                clave: `nueva-${Date.now()}-${Math.random()}`,
            },
        ]);
        setVarianteForm({
            ...formularioVarianteVacio,
            precio: varianteForm.precio,
            stock_minimo: varianteForm.stock_minimo,
        });
        setMensajeModal("");
    };

    const quitarVariante = (clave) => {
        setVariantes((actuales) =>
            actuales.filter((variante) => variante.clave !== clave)
        );
    };

    const actualizarVariante = (clave, campo, valor) => {
        setVariantes((actuales) =>
            actuales.map((variante) =>
                variante.clave === clave
                    ? { ...variante, [campo]: valor }
                    : variante
            )
        );
    };

    const crearFormDataProducto = (datosProducto, stocks) => {
        const formData = new FormData();

        formData.append("categorias_id", datosProducto.categorias_id);
        formData.append("marcas_id", datosProducto.marcas_id);
        formData.append("materiales_id", datosProducto.materiales_id);
        formData.append("genero", datosProducto.genero);
        formData.append("nombre", datosProducto.nombre);
        formData.append("descripcion", datosProducto.descripcion);
        formData.append("estado", datosProducto.estado);

        if (datosProducto.imagen) {
            formData.append("imagen", datosProducto.imagen);
        }

        formData.append("stocks", JSON.stringify(stocks));

        return formData;
    };

    const guardarProducto = async (e) => {
        e.preventDefault();

        if (!productoEditando) return;

        if (variantes.length === 0) {
            setMensajeModal("Agrega al menos una variante de stock.");
            return;
        }

        const formData = crearFormDataProducto(
            form,
            variantes.map((variante) => ({
                id: variante.id,
                tallas_id: variante.tallas_id,
                colores_id: variante.colores_id,
                precio: variante.precio,
                cantidad: variante.cantidad,
                stock_minimo: variante.stock_minimo,
            }))
        );

        setGuardando(true);
        setMensajeModal("");

        try {
            await clienteAxios.post(
                `/productos/${productoEditando.id}?_method=PUT`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            await obtenerDatos();
            setModal(false);
        } catch (error) {
            console.log(error);
            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeModal(
                primerError ||
                    error.response?.data?.message ||
                    "Error al guardar producto"
            );
        } finally {
            setGuardando(false);
        }
    };

    const guardarProductosPendientes = async () => {
        if (productosPendientes.length === 0) {
            setMensajeModal(
                "Usa el botón Agregar producto para incluir al menos uno."
            );
            return;
        }

        setGuardando(true);
        setMensajeModal("");
        let guardados = 0;

        try {
            for (const item of productosPendientes) {
                const formData = crearFormDataProducto(item.producto, [
                    {
                        tallas_id: item.stock.tallas_id,
                        colores_id: item.stock.colores_id,
                        precio: item.stock.precio,
                        cantidad: item.stock.cantidad,
                        stock_minimo: item.stock.stock_minimo,
                    },
                ]);

                await clienteAxios.post("/productos", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
                guardados += 1;
            }

            await obtenerDatos();
            setModal(false);
            reiniciarFormulario();
        } catch (error) {
            console.log(error);
            if (guardados > 0) {
                setProductosPendientes((actuales) =>
                    actuales.slice(guardados)
                );
                await obtenerDatos();
            }

            const errores = error.response?.data?.errors;
            const primerError = errores
                ? Object.values(errores).flat()[0]
                : null;

            setMensajeModal(
                primerError ||
                    error.response?.data?.message ||
                    `${guardados} producto(s) se guardaron; revisa el siguiente.`
            );
        } finally {
            setGuardando(false);
        }
    };

    const eliminarProducto = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar este producto?")) return;

        try {
            await clienteAxios.delete(`/productos/${id}`);
            await obtenerDatos();
        } catch (error) {
            console.log(error);
            alert(
                error.response?.data?.message ||
                    "Error al eliminar producto"
            );
        }
    };

    const abrirModalStock = (producto) => {
        const primerStock = producto.stocks?.[0];

        if (!primerStock) {
            alert(
                "Este producto no tiene una variante de stock. Agrégala desde Editar."
            );
            return;
        }

        setModalStock(producto);
        setStockSeleccionado(String(primerStock.id));
        setCantidadAgregar("");
        setMensajeStock("");
    };

    const agregarStockProducto = async (e) => {
        e.preventDefault();

        if (!stockSeleccionado || Number(cantidadAgregar) < 1) {
            setMensajeStock("Ingresa una cantidad mayor a cero.");
            return;
        }

        setSumandoStock(true);
        setMensajeStock("");

        try {
            await clienteAxios.patch(
                `/stocks/${stockSeleccionado}/incrementar`,
                {
                    cantidad: Number(cantidadAgregar),
                }
            );
            await obtenerDatos();
            setModalStock(null);
        } catch (error) {
            setMensajeStock(
                error.response?.data?.message ||
                    "No se pudo agregar el stock."
            );
        } finally {
            setSumandoStock(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Gestión de productos
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Agrega, modifica, elimina productos y controla su stock.
                    </p>
                </div>

                <button
                    onClick={abrirNuevo}
                    className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-3 rounded-lg font-bold"
                >
                    + Nuevo producto
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex justify-end border-b bg-slate-50 p-4">
                    <button
                        type="button"
                        onClick={() =>
                            window.open(
                                "/panel/productos/reporte-inventario",
                                "_blank",
                                "noopener,noreferrer"
                            )
                        }
                        className="rounded-lg bg-green-700 px-5 py-3 font-bold text-white hover:bg-green-800"
                    >
                        Generar reporte
                    </button>
                </div>
                <table className="w-full">
                    <thead className="bg-blue-950 text-white">
                        <tr>
                            <th className="p-3 text-left">ID</th>
                            <th className="p-3 text-left">Imagen</th>
                            <th className="p-3 text-left">Producto</th>
                            <th className="p-3 text-left">Código</th>
                            <th className="p-3 text-left">Precio</th>
                            <th className="p-3 text-left">Stock</th>
                            <th className="p-3 text-left">Estado</th>
                            <th className="p-3 text-left">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {productos.map((producto) => {
                            const stocks = producto.stocks || [];
                            const stock = producto.stock || stocks[0];
                            const stockTotal = stocks.reduce(
                                (total, item) =>
                                    total + Number(item.cantidad || 0),
                                0
                            );

                            return (
                                <tr key={producto.id} className="border-b hover:bg-slate-50">
                                    <td className="p-3">{producto.id}</td>

                                    <td className="p-3">
                                        <img
                                            src={
                                                producto.imagen
                                                    ? `http://127.0.0.1:8000/storage/${producto.imagen}`
                                                    : "https://via.placeholder.com/80"
                                            }
                                            alt={producto.nombre}
                                            className="w-16 h-16 object-contain rounded border"
                                        />
                                    </td>

                                    <td className="p-3">
                                        <p className="font-bold">{producto.nombre}</p>
                                        <p className="text-sm text-gray-500">
                                            {producto.descripcion}
                                        </p>
                                    </td>

                                    <td className="p-3">
                                        {stocks.length > 1
                                            ? `${stocks.length} variantes`
                                            : stock?.codigo || "Sin código"}
                                    </td>

                                    <td className="p-3">
                                        S/ {Number(stock?.precio ?? 0).toFixed(2)}
                                    </td>

                                    <td className="p-3">
                                        <p className="font-bold text-blue-900">
                                            Cantidad:{" "}
                                            {stocks.length
                                                ? stockTotal
                                                : stock?.cantidad ?? 0}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {stocks.length > 1
                                                ? `${stocks.length} combinaciones`
                                                : `Mínimo: ${stock?.stock_minimo ?? 0}`}
                                        </p>
                                    </td>

                                    <td className="p-3">
                                        {producto.estado == 1 ? (
                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">
                                                Activo
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">
                                                Inactivo
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                title="Agregar stock"
                                                aria-label={`Agregar stock a ${producto.nombre}`}
                                                onClick={() =>
                                                    abrirModalStock(producto)
                                                }
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-2xl font-bold leading-none text-white shadow hover:bg-green-700"
                                            >
                                                +
                                            </button>

                                            <button
                                                onClick={() => abrirEditar(producto)}
                                                className="bg-yellow-400 hover:bg-yellow-500 text-blue-950 px-3 py-2 rounded font-bold"
                                            >
                                                Editar
                                            </button>

                                            <button
                                                onClick={() => eliminarProducto(producto.id)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded font-bold"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="relative max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
                        <button
                            onClick={() => setModal(false)}
                            className="absolute top-3 right-4 text-2xl font-bold text-gray-500 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h2 className="text-2xl font-bold text-blue-950 mb-5">
                            {productoEditando ? "Editar producto" : "Nuevo producto"}
                        </h2>

                        {mensajeModal && (
                            <div className="mb-4 rounded-lg bg-blue-100 px-4 py-3 font-semibold text-blue-800">
                                {mensajeModal}
                            </div>
                        )}

                        <form onSubmit={guardarProducto} className="grid grid-cols-2 gap-4">
                            <select
                                value={form.categorias_id}
                                onChange={(e) => setForm({ ...form, categorias_id: e.target.value })}
                                className="border px-4 py-3 rounded"
                                required
                            >
                                <option value="">Seleccione categoría</option>
                                {categorias.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={form.marcas_id}
                                onChange={(e) => setForm({ ...form, marcas_id: e.target.value })}
                                className="border px-4 py-3 rounded"
                                required
                            >
                                <option value="">Seleccione marca</option>
                                {marcas.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={form.materiales_id}
                                onChange={(e) => setForm({ ...form, materiales_id: e.target.value })}
                                className="border px-4 py-3 rounded"
                                required
                            >
                                <option value="">Seleccione material</option>
                                {materiales.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.nombre}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={form.genero}
                                onChange={(e) => setForm({ ...form, genero: e.target.value })}
                                className="border px-4 py-3 rounded"
                                required
                            >
                                <option value="">Seleccione género</option>
                                <option value="Hombre">Hombre</option>
                                <option value="Mujer">Mujer</option>
                                <option value="Unisex">Unisex</option>
                            </select>

                            <input
                                type="text"
                                placeholder="Nombre del producto"
                                value={form.nombre}
                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                className="border px-4 py-3 rounded"
                                required
                            />

                            <select
                                value={form.estado}
                                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                                className="border px-4 py-3 rounded"
                            >
                                <option value="1">Activo</option>
                                <option value="0">Inactivo</option>
                            </select>

                            <textarea
                                placeholder="Descripción"
                                value={form.descripcion}
                                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                className="border px-4 py-3 rounded col-span-2"
                                required
                            />

                            <input
                                key={archivoKey}
                                type="file"
                                onChange={(e) => setForm({ ...form, imagen: e.target.files[0] })}
                                className="border px-4 py-3 rounded col-span-2"
                            />

                            {productoEditando ? (
                            <section className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-blue-950">
                                        Variantes de talla, color y stock
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Agrega todas las combinaciones antes de guardar el producto.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                                    <select
                                        value={varianteForm.tallas_id}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                tallas_id: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    >
                                        <option value="">Talla</option>
                                        {tallas.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={varianteForm.colores_id}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                colores_id: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    >
                                        <option value="">Color</option>
                                        {colores.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Precio"
                                        value={varianteForm.precio}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                precio: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={varianteForm.cantidad}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                cantidad: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Stock mínimo"
                                        value={varianteForm.stock_minimo}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                stock_minimo: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <button
                                        type="button"
                                        onClick={agregarVariante}
                                        className="rounded bg-cyan-700 px-4 py-2 font-bold text-white hover:bg-cyan-800"
                                    >
                                        + Agregar
                                    </button>
                                </div>

                                <div className="mt-4 overflow-x-auto rounded-lg border bg-white">
                                    <table className="w-full min-w-[820px]">
                                        <thead className="bg-blue-950 text-white">
                                            <tr>
                                                <th className="p-3 text-left">Talla</th>
                                                <th className="p-3 text-left">Color</th>
                                                <th className="p-3 text-left">Precio</th>
                                                <th className="p-3 text-left">Cantidad</th>
                                                <th className="p-3 text-left">Stock mínimo</th>
                                                <th className="p-3 text-left">Código</th>
                                                <th className="p-3 text-left">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {variantes.map((variante) => (
                                                <tr
                                                    key={variante.clave}
                                                    className="border-b last:border-0"
                                                >
                                                    <td className="p-2">
                                                        <select
                                                            value={variante.tallas_id}
                                                            onChange={(e) =>
                                                                actualizarVariante(
                                                                    variante.clave,
                                                                    "tallas_id",
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded border px-2 py-2"
                                                        >
                                                            {tallas.map((item) => (
                                                                <option key={item.id} value={item.id}>
                                                                    {item.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={variante.colores_id}
                                                            onChange={(e) =>
                                                                actualizarVariante(
                                                                    variante.clave,
                                                                    "colores_id",
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full rounded border px-2 py-2"
                                                        >
                                                            {colores.map((item) => (
                                                                <option key={item.id} value={item.id}>
                                                                    {item.nombre}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    {["precio", "cantidad", "stock_minimo"].map(
                                                        (campo) => (
                                                            <td key={campo} className="p-2">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step={campo === "precio" ? "0.01" : "1"}
                                                                    value={variante[campo]}
                                                                    onChange={(e) =>
                                                                        actualizarVariante(
                                                                            variante.clave,
                                                                            campo,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full rounded border px-2 py-2"
                                                                    required
                                                                />
                                                            </td>
                                                        )
                                                    )}
                                                    <td className="p-3 text-sm text-slate-500">
                                                        {variante.codigo || "Automático"}
                                                    </td>
                                                    <td className="p-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                quitarVariante(variante.clave)
                                                            }
                                                            className="rounded bg-red-500 px-3 py-2 font-bold text-white hover:bg-red-600"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {!variantes.length && (
                                                <tr>
                                                    <td
                                                        colSpan="7"
                                                        className="p-5 text-center text-slate-500"
                                                    >
                                                        Todavía no agregaste variantes.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            ) : (
                            <section className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-4">
                                    <h3 className="text-lg font-bold text-blue-950">
                                        Producto que vas a agregar
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Completa su talla, color y stock, luego agrégalo a la lista.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                                    <select
                                        value={varianteForm.tallas_id}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                tallas_id: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    >
                                        <option value="">Talla</option>
                                        {tallas.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={varianteForm.colores_id}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                colores_id: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    >
                                        <option value="">Color</option>
                                        {colores.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="Precio"
                                        value={varianteForm.precio}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                precio: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Cantidad"
                                        value={varianteForm.cantidad}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                cantidad: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="Stock mínimo"
                                        value={varianteForm.stock_minimo}
                                        onChange={(e) =>
                                            setVarianteForm({
                                                ...varianteForm,
                                                stock_minimo: e.target.value,
                                            })
                                        }
                                        className="rounded border bg-white px-3 py-2"
                                    />

                                    <button
                                        type="button"
                                        onClick={agregarProductoPendiente}
                                        className="rounded bg-cyan-700 px-4 py-2 font-bold text-white hover:bg-cyan-800"
                                    >
                                        + Agregar producto
                                    </button>
                                </div>

                                <div className="mt-5">
                                    <h3 className="mb-2 font-bold text-blue-950">
                                        Productos por registrar ({productosPendientes.length})
                                    </h3>
                                    <div className="overflow-x-auto rounded-lg border bg-white">
                                        <table className="w-full min-w-[900px]">
                                            <thead className="bg-blue-950 text-white">
                                                <tr>
                                                    <th className="p-3 text-left">Producto</th>
                                                    <th className="p-3 text-left">Categoría</th>
                                                    <th className="p-3 text-left">Talla</th>
                                                    <th className="p-3 text-left">Color</th>
                                                    <th className="p-3 text-left">Precio</th>
                                                    <th className="p-3 text-left">Cantidad</th>
                                                    <th className="p-3 text-left">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productosPendientes.map((item) => (
                                                    <tr
                                                        key={item.clave}
                                                        className="border-b last:border-0"
                                                    >
                                                        <td className="p-3 font-semibold">
                                                            {item.producto.nombre}
                                                        </td>
                                                        <td className="p-3">
                                                            {obtenerNombre(
                                                                categorias,
                                                                item.producto.categorias_id
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {obtenerNombre(
                                                                tallas,
                                                                item.stock.tallas_id
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            {obtenerNombre(
                                                                colores,
                                                                item.stock.colores_id
                                                            )}
                                                        </td>
                                                        <td className="p-3">
                                                            S/ {Number(item.stock.precio).toFixed(2)}
                                                        </td>
                                                        <td className="p-3">
                                                            {item.stock.cantidad}
                                                        </td>
                                                        <td className="p-3">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    quitarProductoPendiente(
                                                                        item.clave
                                                                    )
                                                                }
                                                                className="rounded bg-red-500 px-3 py-2 font-bold text-white hover:bg-red-600"
                                                            >
                                                                Quitar
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!productosPendientes.length && (
                                                    <tr>
                                                        <td
                                                            colSpan="7"
                                                            className="p-5 text-center text-slate-500"
                                                        >
                                                            Todavía no agregaste productos al lote.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                            )}

                            <div className="col-span-2 flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setModal(false)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white hover:bg-slate-600"
                                >
                                    Cerrar
                                </button>

                                <button
                                    type={productoEditando ? "submit" : "button"}
                                    onClick={
                                        productoEditando
                                            ? undefined
                                            : guardarProductosPendientes
                                    }
                                    disabled={guardando}
                                    className="rounded-lg bg-blue-900 px-5 py-3 font-bold text-white hover:bg-blue-950 disabled:opacity-60"
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : productoEditando
                                          ? "Guardar cambios"
                                          : `Guardar y cerrar (${productosPendientes.length})`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalStock && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
                    <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
                        <button
                            type="button"
                            onClick={() => setModalStock(null)}
                            className="absolute right-4 top-3 text-2xl font-bold text-gray-500 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h2 className="mb-1 text-2xl font-bold text-blue-950">
                            Agregar stock
                        </h2>
                        <p className="mb-5 text-slate-600">
                            {modalStock.nombre}
                        </p>

                        {mensajeStock && (
                            <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-red-700">
                                {mensajeStock}
                            </div>
                        )}

                        <form
                            onSubmit={agregarStockProducto}
                            className="space-y-4"
                        >
                            <label className="block">
                                <span className="mb-1 block font-semibold">
                                    Talla y color
                                </span>
                                <select
                                    value={stockSeleccionado}
                                    onChange={(e) =>
                                        setStockSeleccionado(e.target.value)
                                    }
                                    className="w-full rounded-lg border px-4 py-3"
                                    required
                                >
                                    {modalStock.stocks.map((stock) => (
                                        <option key={stock.id} value={stock.id}>
                                            {stock.talla?.nombre || "Sin talla"} -{" "}
                                            {stock.color?.nombre || "Sin color"}{" "}
                                            (actual: {stock.cantidad})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-1 block font-semibold">
                                    Unidades que deseas agregar
                                </span>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={cantidadAgregar}
                                    onChange={(e) =>
                                        setCantidadAgregar(e.target.value)
                                    }
                                    placeholder="Ejemplo: 10"
                                    className="w-full rounded-lg border px-4 py-3"
                                    required
                                    autoFocus
                                />
                            </label>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalStock(null)}
                                    className="rounded-lg bg-slate-500 px-5 py-3 font-bold text-white hover:bg-slate-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={sumandoStock}
                                    className="rounded-lg bg-green-600 px-5 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-60"
                                >
                                    {sumandoStock
                                        ? "Agregando..."
                                        : "Agregar stock"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductosPanel;
