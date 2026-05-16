// src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'

import { ProductoProvider } from './context/ProductoProvider'
import Producto from './views/Producto'

import './index.css'

ReactDOM.createRoot(
    document.getElementById('root')
).render(
  
    <React.StrictMode>

        {/* ProductoProvider envuelve Producto */}
        {/* Da acceso global al estado y funciones */}

        <ProductoProvider>

            <Producto />

        </ProductoProvider>

    </React.StrictMode>

)


// Si existen más módulos:
//
// <LoadingProvider>
//   <ProductoProvider>
//     <CarritoProvider>
//
//       <Producto />
//
//     </CarritoProvider>
//   </ProductoProvider>
// </LoadingProvider>