// src/context/ProductoProvider.jsx

import { createContext, useState, useEffect } from 'react'
import clienteAxios from '../config/axios'

// PARTE 1: Crear el contexto (el canal de datos)
const ProductoContext = createContext()

const ProductoProvider = ({ children }) => {

    // PARTE 2: Estado del módulo
    const [productos, setProductos] = useState([])
    const [cargando, setCargando] = useState(false)
    const [alerta, setAlerta] = useState({ msg: '', error: false })
    const [modoEdicion, setModoEdicion] = useState(false)
    const [editandoId, setEditandoId] = useState(null)

    // Estado del formulario
    const [form, setForm] = useState({
        nombre: '',
        precio: '',
        imagen: ''
    })

    // Manejar cambios en los inputs
    const handleInputChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        })
    }

    // Limpiar formulario
    const resetForm = () => {
        setForm({
            nombre: '',
            precio: '',
            imagen: ''
        })

        setModoEdicion(false)
        setEditandoId(null)
    }

    // Mostrar alertas
    const mostrarAlerta = (msg, error = false) => {
        setAlerta({ msg, error })

        setTimeout(() => {
            setAlerta({ msg: '', error: false })
        }, 3000)
    }

    // PARTE 3a: GET — Obtener productos
    const fetchProductos = async () => {

        setCargando(true)

        try {

            const { data } = await clienteAxios.get('/api/productos')

            setProductos(data)

        } catch (error) {

            mostrarAlerta('Error al cargar los productos', true)

        } finally {

            setCargando(false)

        }
    }

    // PARTE 3b: POST — Crear producto
    const crearProducto = async (e) => {

        e.preventDefault()

        setCargando(true)

        try {

            const { data } = await clienteAxios.post('/api/productos', form)

            setProductos(prev => [...prev, data])

            mostrarAlerta('Producto creado correctamente')

            resetForm()

        } catch (error) {

            const msg =
                error.response?.data?.message || 'Error al crear'

            mostrarAlerta(msg, true)

        } finally {

            setCargando(false)

        }
    }

    // PARTE 3c: Cargar datos para editar
    const editarProducto = (producto) => {

        setForm({
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen
        })

        setModoEdicion(true)

        setEditandoId(producto.id)
    }

    // PARTE 3d: PUT — Actualizar producto
    const actualizarProducto = async (e) => {

        e.preventDefault()

        setCargando(true)

        try {

            const { data } = await clienteAxios.put(
                `/api/productos/${editandoId}`,
                form
            )

            setProductos(productos.map(p =>
                    p.id === editandoId ? data : p
                )
            )

            mostrarAlerta('Producto actualizado correctamente')

            resetForm()

        } catch (error) {

            mostrarAlerta('Error al actualizar', true)

        } finally {

            setCargando(false)

        }
    }

    // PARTE 3e: DELETE — Eliminar producto
    const eliminarProducto = async (id) => {

        if (!window.confirm('¿Confirma eliminar este producto?')) return

        setCargando(true)

        try {

            await clienteAxios.delete(`/api/productos/${id}`)

            setProductos(prev =>
                prev.filter(p => p.id !== id)
            )

            mostrarAlerta('Producto eliminado')

        } catch (error) {

            mostrarAlerta('Error al eliminar', true)

        } finally {

            setCargando(false)

        }
    }

    // PARTE 4: Cargar productos al iniciar
    useEffect(() => {

        fetchProductos()

    }, [])

    return (

        // PARTE 5: Compartir datos y funciones
        <ProductoContext.Provider
            value={{
                productos,
                form,
                alerta,
                cargando,
                modoEdicion,
                handleInputChange,
                crearProducto,
                actualizarProducto,
                editarProducto,
                eliminarProducto,
                resetForm,
            }}
        >
            {children}
        </ProductoContext.Provider>
    )
}

export { ProductoProvider }

export default ProductoContext