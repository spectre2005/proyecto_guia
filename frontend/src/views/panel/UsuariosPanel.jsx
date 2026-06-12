import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const UsuariosPanel = () => {

    const usuarioLogeado = JSON.parse(localStorage.getItem("usuario"));
    const rolLogeado = usuarioLogeado?.role?.nombre;

    const [usuarios, setUsuarios] = useState([]);
    const [filtroRol, setFiltroRol] = useState("Todos");

    const obtenerUsuarios = async () => {
        try {

            const { data } = await clienteAxios.get("/usuarios");

            setUsuarios(
                Array.isArray(data)
                    ? data
                    : data.data || []
            );

        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        obtenerUsuarios();
    }, []);

    // CAMBIAR ROL
    const cambiarRol = async (id, nuevoRol) => {

        try {

            const usuario = usuarios.find((u) => u.id === id);

            await clienteAxios.put(`/usuarios/${id}`, {
                personas_id: usuario.personas_id,
                roles_id: nuevoRol,
                username: usuario.username,
                estado: usuario.estado,
            });

            obtenerUsuarios();

        } catch (error) {
            console.log(error);
            alert("Error al cambiar rol");
        }
    };

    // CAMBIAR ESTADO
    const cambiarEstado = async (id, nuevoEstado) => {

        try {

            const usuario = usuarios.find((u) => u.id === id);

            await clienteAxios.put(`/usuarios/${id}`, {
                personas_id: usuario.personas_id,
                roles_id: usuario.roles_id,
                username: usuario.username,
                estado: nuevoEstado,
            });

            obtenerUsuarios();

        } catch (error) {
            console.log(error);
            alert("Error al cambiar estado");
        }
    };

    // FILTRO
    const usuariosFiltrados = usuarios.filter((usuario) => {

        if (filtroRol === "Todos") return true;

        return usuario.role?.nombre === filtroRol;
    });

    return (
        <div>

            <div className="flex justify-between items-center mb-6">

                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Gestión de usuarios
                    </h2>

                    <p className="text-gray-600 mt-2">
                        Administra roles y estados de los usuarios.
                    </p>
                </div>

                <select
                    value={filtroRol}
                    onChange={(e) => setFiltroRol(e.target.value)}
                    className="border px-4 py-2 rounded-lg"
                >
                    <option value="Todos">Todos</option>
                    <option value="Cliente">
                        Usuarios registrados
                    </option>
                    <option value="Vendedor">
                        Vendedores
                    </option>
                    <option value="Administrador">
                        Administradores
                    </option>
                </select>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-blue-950 text-white">

                        <tr>
                            <th className="p-4 text-left">ID</th>
                            <th className="p-4 text-left">Persona</th>
                            <th className="p-4 text-left">Usuario</th>
                            <th className="p-4 text-left">Email</th>
                            <th className="p-4 text-left">Rol</th>
                            <th className="p-4 text-left">Estado</th>
                        </tr>

                    </thead>

                    <tbody>

                        {usuariosFiltrados.map((usuario) => (

                            <tr
                                key={usuario.id}
                                className="border-b hover:bg-slate-50"
                            >

                                <td className="p-4">
                                    {usuario.id}
                                </td>

                                <td className="p-4">
                                    <div>
                                        <p className="font-semibold">
                                            {usuario.persona?.nombre}{" "}
                                            {usuario.persona?.apellido}
                                        </p>

                                        <p className="text-sm text-gray-500">
                                            DNI:
                                            {" "}
                                            {usuario.persona?.dni || "Sin DNI"}
                                        </p>
                                    </div>
                                </td>

                                <td className="p-4">
                                    {usuario.username}
                                </td>

                                <td className="p-4">
                                    {usuario.persona?.email}
                                </td>

                                <td className="p-4">

                                    {rolLogeado === "Administrador" ? (

                                        <select
                                            value={usuario.roles_id}
                                            onChange={(e) =>
                                                cambiarRol(
                                                    usuario.id,
                                                    e.target.value
                                                )
                                            }
                                            className="border px-3 py-2 rounded-lg"
                                        >
                                            <option value="1">
                                                Usuario registrado
                                            </option>

                                            <option value="2">
                                                Vendedor
                                            </option>

                                            <option value="3">
                                                Administrador
                                            </option>

                                        </select>

                                    ) : (

                                        <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                            {usuario.role?.nombre}
                                        </span>

                                    )}

                                </td>

                                <td className="p-4">

                                    {rolLogeado === "Administrador" ? (

                                        <select
                                            value={usuario.estado}
                                            onChange={(e) =>
                                                cambiarEstado(
                                                    usuario.id,
                                                    e.target.value
                                                )
                                            }
                                            className={`px-3 py-2 rounded-lg font-semibold
                                            ${
                                                Number(usuario.estado) === 1
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            <option value="1">
                                                Activo
                                            </option>

                                            <option value="0">
                                                Inactivo
                                            </option>

                                        </select>

                                    ) : (

                                        <span
                                            className={`px-3 py-1 rounded-full text-sm font-bold
                                            ${
                                                Number(usuario.estado) === 1
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {Number(usuario.estado) === 1
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>

                                    )}

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
};

export default UsuariosPanel;