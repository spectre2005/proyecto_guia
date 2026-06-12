import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const MarcasPanel = () => {

    const [marcas, setMarcas] = useState([]);
    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        descripcion: "",
    });

    // =========================
    // OBTENER MARCAS
    // =========================
    const obtenerMarcas = async () => {

        try {

            const { data } = await clienteAxios.get("/marcas");

            setMarcas(Array.isArray(data) ? data : data.data || []);

        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        obtenerMarcas();
    }, []);

    // =========================
    // NUEVA MARCA
    // =========================
    const abrirNuevo = () => {

        setEditando(null);

        setForm({
            nombre: "",
            descripcion: "",
        });

        setModal(true);
    };

    // =========================
    // EDITAR
    // =========================
    const abrirEditar = (marca) => {

        setEditando(marca);

        setForm({
            nombre: marca.nombre || "",
            descripcion: marca.descripcion || "",
        });

        setModal(true);
    };

    // =========================
    // GUARDAR
    // =========================
    const guardarMarca = async (e) => {

        e.preventDefault();

        try {

            if (editando) {

                await clienteAxios.put(
                    `/marcas/${editando.id}`,
                    form
                );

            } else {

                await clienteAxios.post(
                    "/marcas",
                    form
                );
            }

            setModal(false);

            obtenerMarcas();

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Error al guardar marca"
            );
        }
    };

    // =========================
    // ELIMINAR
    // =========================
    const eliminarMarca = async (id) => {

        const confirmar = confirm(
            "¿Deseas eliminar esta marca?"
        );

        if (!confirmar) return;

        try {

            await clienteAxios.delete(`/marcas/${id}`);

            obtenerMarcas();

        } catch (error) {

            console.log(error);

            alert("Error al eliminar marca");
        }
    };

    return (
        <div>

            <div className="flex justify-between items-center mb-6">

                <div>
                    <h2 className="text-4xl font-bold text-blue-950">
                        Marcas
                    </h2>

                    <p className="text-gray-600 mt-2">
                        Gestiona las marcas de productos.
                    </p>
                </div>

                <button
                    onClick={abrirNuevo}
                    className="bg-blue-900 hover:bg-blue-950 text-white px-5 py-3 rounded-lg font-bold"
                >
                    + Nueva marca
                </button>
            </div>

            {/* TABLA */}

            <div className="bg-white rounded-xl shadow overflow-hidden">

                <table className="w-full">

                    <thead className="bg-blue-950 text-white">

                        <tr>
                            <th className="p-4 text-left">ID</th>
                            <th className="p-4 text-left">Nombre</th>
                            <th className="p-4 text-left">Descripción</th>
                            <th className="p-4 text-left">Acciones</th>
                        </tr>

                    </thead>

                    <tbody>

                        {marcas.map((marca) => (

                            <tr
                                key={marca.id}
                                className="border-b hover:bg-slate-50"
                            >

                                <td className="p-4">
                                    {marca.id}
                                </td>

                                <td className="p-4 font-semibold">
                                    {marca.nombre}
                                </td>

                                <td className="p-4">
                                    {marca.descripcion}
                                </td>

                                <td className="p-4 flex gap-2">

                                    <button
                                        onClick={() => abrirEditar(marca)}
                                        className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded font-bold"
                                    >
                                        Editar
                                    </button>

                                    <button
                                        onClick={() => eliminarMarca(marca.id)}
                                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-bold"
                                    >
                                        Eliminar
                                    </button>

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

            {/* MODAL */}

            {modal && (

                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">

                    <form
                        onSubmit={guardarMarca}
                        className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 relative"
                    >

                        <button
                            type="button"
                            onClick={() => setModal(false)}
                            className="absolute top-3 right-4 text-2xl font-bold text-gray-500 hover:text-red-500"
                        >
                            ×
                        </button>

                        <h3 className="text-2xl font-bold text-blue-950 mb-5">
                            {editando
                                ? "Editar marca"
                                : "Nueva marca"}
                        </h3>

                        <input
                            type="text"
                            placeholder="Nombre de la marca"
                            value={form.nombre}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    nombre: e.target.value
                                })
                            }
                            className="w-full border px-4 py-3 rounded-lg mb-4"
                            required
                        />

                        <textarea
                            placeholder="Descripción"
                            value={form.descripcion}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    descripcion: e.target.value
                                })
                            }
                            className="w-full border px-4 py-3 rounded-lg mb-5"
                            rows={4}
                            required
                        />

                        <button
                            className="w-full bg-blue-900 hover:bg-blue-950 text-white py-3 rounded-lg font-bold"
                        >
                            Guardar marca
                        </button>

                    </form>

                </div>

            )}

        </div>
    );
};

export default MarcasPanel;