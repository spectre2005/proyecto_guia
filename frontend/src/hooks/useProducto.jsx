// src/hooks/useProducto.jsx

import { useContext } from 'react'
import ProductoContext from '../context/ProductoProvider'

// Hook personalizado
const useProducto = () => useContext(ProductoContext)

export default useProducto

// ¿Cómo se usa en cualquier componente?

// const {
//     productos,
//     crearProducto,
//     eliminarProducto
// } = useProducto()

// Una sola línea da acceso a TODO el Provider