import { createContext, useCallback, useState } from "react";
import clienteAxios from "../config/axios";

const ProductoContext = createContext();

const ProductoProvider = ({ children }) => {

    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);

    // OBTENER PRODUCTOS
    const obtenerProductos = useCallback(async () => {
        setLoading(true);

        try {

            const { data } = await clienteAxios.get("/productos");

            setProductos(
                Array.isArray(data)
                    ? data
                    : data.data || []
            );

        } catch (error) {

            console.log(error);
            setProductos([]);

        } finally {
            setLoading(false);
        }
    }, []);

    // REGISTRAR PRODUCTO
    const registrarProducto = async (producto) => {

        try {

            const { data } = await clienteAxios.post(
                "/productos",
                producto,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            setProductos((prev) => [
                ...prev,
                data.data || data
            ]);

            return {
                ok: true,
                mensaje: "Producto registrado correctamente",
            };

        } catch (error) {

            console.log(error);

            return {
                ok: false,
                mensaje:
                    error.response?.data?.message ||
                    "Error al registrar producto",
            };
        }
    };

    // ACTUALIZAR PRODUCTO
    const actualizarProducto = async (id, producto) => {

        try {

            const { data } = await clienteAxios.post(
                `/productos/${id}?_method=PUT`,
                producto,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            const productosActualizados = productos.map((item) =>
                item.id === id
                    ? (data.data || data)
                    : item
            );

            setProductos(productosActualizados);

            return {
                ok: true,
                mensaje: "Producto actualizado correctamente",
            };

        } catch (error) {

            console.log(error);

            return {
                ok: false,
                mensaje:
                    error.response?.data?.message ||
                    "Error al actualizar producto",
            };
        }
    };

    // ELIMINAR PRODUCTO
    const eliminarProducto = async (id) => {

        try {

            await clienteAxios.delete(`/productos/${id}`);

            const productosFiltrados = productos.filter(
                (producto) => producto.id !== id
            );

            setProductos(productosFiltrados);

            return {
                ok: true,
                mensaje: "Producto eliminado correctamente",
            };

        } catch (error) {

            console.log(error);

            return {
                ok: false,
                mensaje:
                    error.response?.data?.message ||
                    "Error al eliminar producto",
            };
        }
    };

    return (
        <ProductoContext.Provider
            value={{
                productos,
                loading,
                obtenerProductos,
                registrarProducto,
                actualizarProducto,
                eliminarProducto,
            }}
        >
            {children}
        </ProductoContext.Provider>
    );
};

export {
    ProductoProvider
};

export default ProductoContext;
