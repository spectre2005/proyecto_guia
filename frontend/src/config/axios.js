import axios from 'axios'

const clienteAxios = axios.create({

    // URL base del backend Laravel
    baseURL: 'http://127.0.0.1:8000',

    // Configuración de headers
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }

})

export default clienteAxios