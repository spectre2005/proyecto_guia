// src/views/Producto.jsx

import useProducto from '../hooks/useProducto'

export default function Producto() {

    // Una sola línea conecta con TODO el Provider
    const {
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
    } = useProducto()

    return (

        <div
            style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '20px'
            }}
        >

            <h1>Gestión de Productos</h1>

            {/* ALERTA */}
            {alerta.msg && (

                <div
                    style={{
                        padding: '12px',
                        marginBottom: '16px',
                        borderRadius: '6px',
                        backgroundColor: alerta.error
                            ? '#ffebee'
                            : '#e8f5e9',
                        color: alerta.error
                            ? '#c62828'
                            : '#2e7d32',
                        border: `1px solid ${
                            alerta.error
                                ? '#ef9a9a'
                                : '#a5d6a7'
                        }`
                    }}
                >
                    {alerta.msg}
                </div>

            )}

            {/* FORMULARIO */}
            <div
                style={{
                    backgroundColor: '#f8f9fa',
                    padding: '20px',
                    borderRadius: '8px',
                    marginBottom: '30px'
                }}
            >

                <h2>
                    {modoEdicion
                        ? 'Editar Producto'
                        : 'Crear Nuevo Producto'}
                </h2>

                <form
                    onSubmit={
                        modoEdicion
                            ? actualizarProducto
                            : crearProducto
                    }
                >

                    {/* NOMBRE */}
                    <div style={{ marginBottom: '12px' }}>

                        <label>Nombre del producto</label>

                        <input
                            type="text"
                            name="nombre"
                            value={form.nombre}
                            onChange={handleInputChange}
                            placeholder="Ej: Laptop HP"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px',
                                marginTop: '4px'
                            }}
                        />

                    </div>

                    {/* PRECIO */}
                    <div style={{ marginBottom: '12px' }}>

                        <label>Precio (S/.)</label>

                        <input
                            type="number"
                            name="precio"
                            value={form.precio}
                            onChange={handleInputChange}
                            placeholder="Ej: 2500"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px',
                                marginTop: '4px'
                            }}
                        />

                    </div>

                    {/* IMAGEN */}
                    <div style={{ marginBottom: '20px' }}>

                        <label>Imagen (URL)</label>

                        <input
                            type="text"
                            name="imagen"
                            value={form.imagen}
                            onChange={handleInputChange}
                            placeholder="https://ejemplo.com/imagen.jpg"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '8px',
                                marginTop: '4px'
                            }}
                        />

                    </div>

                    {/* BOTÓN GUARDAR */}
                    <button
                        type="submit"
                        disabled={cargando}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#1a2b4a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                        }}
                    >

                        {cargando
                            ? 'Guardando...'
                            : (
                                modoEdicion
                                    ? 'Actualizar'
                                    : 'Crear Producto'
                            )
                        }

                    </button>

                    {/* BOTÓN CANCELAR */}
                    {modoEdicion && (

                        <button
                            type="button"
                            onClick={resetForm}
                            style={{
                                marginLeft: '12px',
                                padding: '10px 24px',
                                backgroundColor: '#666',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancelar
                        </button>

                    )}

                </form>

            </div>

            {/* TABLA */}
            <h2>
                Lista de Productos ({productos.length})
            </h2>

            {cargando && <p>Cargando...</p>}

            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse'
                }}
            >

                <thead>

                    <tr
                        style={{
                            backgroundColor: '#1a2b4a',
                            color: 'white'
                        }}
                    >

                        <th style={{ padding: '10px' }}>ID</th>

                        <th style={{ padding: '10px' }}>
                            Nombre
                        </th>

                        <th style={{ padding: '10px' }}>
                            Precio
                        </th>

                        <th style={{ padding: '10px' }}>
                            Acciones
                        </th>

                    </tr>

                </thead>

                <tbody>

                    {productos.map(producto => (

                        <tr
                            key={producto.id}
                            style={{
                                borderBottom: '1px solid #ddd'
                            }}
                        >

                            <td
                                style={{
                                    padding: '10px',
                                    textAlign: 'center'
                                }}
                            >
                                {producto.id}
                            </td>

                            <td style={{ padding: '10px' }}>
                                {producto.nombre}
                            </td>

                            <td
                                style={{
                                    padding: '10px',
                                    textAlign: 'right'
                                }}
                            >
                                S/. {producto.precio}
                            </td>

                            <td
                                style={{
                                    padding: '10px',
                                    textAlign: 'center'
                                }}
                            >

                                {/* EDITAR */}
                                <button
                                    onClick={() =>
                                        editarProducto(producto)
                                    }
                                    style={{
                                        marginRight: '8px',
                                        padding: '6px 14px',
                                        backgroundColor: '#00897b',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Editar
                                </button>

                                {/* ELIMINAR */}
                                <button
                                    onClick={() =>
                                        eliminarProducto(producto.id)
                                    }
                                    style={{
                                        padding: '6px 14px',
                                        backgroundColor: '#c62828',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Eliminar
                                </button>

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    )
}