import axios from "axios";

const respuestasCache = new Map();
const peticionesPendientes = new Map();
const adaptadorPredeterminado = axios.getAdapter(axios.defaults.adapter);
const DURACION_CACHE = 15000;

const clavePeticion = (config) => {
    const token = localStorage.getItem("token") || "publico";
    const parametros = new URLSearchParams(config.params || {}).toString();

    return `${token}:${config.baseURL || ""}${config.url}?${parametros}`;
};

const clienteAxios = axios.create({
    baseURL: "http://127.0.0.1:8000/api",
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
    adapter: async (config) => {
        const metodo = String(config.method || "get").toLowerCase();

        if (metodo !== "get") {
            respuestasCache.clear();
            peticionesPendientes.clear();
            return adaptadorPredeterminado(config);
        }

        const clave = clavePeticion(config);
        const guardada = respuestasCache.get(clave);

        if (guardada && Date.now() - guardada.fecha < DURACION_CACHE) {
            return guardada.respuesta;
        }

        if (peticionesPendientes.has(clave)) {
            return peticionesPendientes.get(clave);
        }

        const peticion = adaptadorPredeterminado(config)
            .then((respuesta) => {
                respuestasCache.set(clave, {
                    fecha: Date.now(),
                    respuesta,
                });
                return respuesta;
            })
            .finally(() => {
                peticionesPendientes.delete(clave);
            });

        peticionesPendientes.set(clave, peticion);
        return peticion;
    },
});

clienteAxios.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export default clienteAxios;
