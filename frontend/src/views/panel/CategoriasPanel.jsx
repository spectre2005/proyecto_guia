import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const CategoriasPanel = () => {
    const [categorias, setCategorias] = useState([]);
    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        descripcion: "",
    });

    const obtenerCategorias = async () => {
        const { data } = await clienteAxios.get("/categorias");
        setCategorias(Array.isArray(data) ? data : data.data || []);
    };

    useEffect(() => {
        obtenerCategorias();
    }, []);

    const abrirNuevo = () => {
        setEditando(null);
        setForm({ nombre: "", descripcion: "" });
        setModal(true);
    };

    const abrirEditar = (item) => {
        setEditando(item);
        setForm({
            nombre: item.nombre || "",
            descripcion: item.descripcion || "",
        });
        setModal(true);
    };

    const guardar = async (e) => {
        e.preventDefault();

        try {
            if (editando) {
                await clienteAxios.put(`/categorias/${editando.id}`, form);
            } else {
                await clienteAxios.post("/categorias", form);
            }

            setModal(false);
            obtenerCategorias();
        } catch (error) {
            console.log(error);
            alert(error.response?.data?.message || "Error al guardar categoría");
        }
    };

    const eliminar = async (id) => {
        if (!confirm("¿Eliminar esta categoría?")) return;

        try {
            await clienteAxios.delete(`/categorias/${id}`);
            obtenerCategorias();
        } catch (error) {
            console.log(error);
            alert("Error al eliminar categoría");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">Categorías</h2>
                    <p className="text-gray-600 mt-2">Gestiona las categorías de productos.</p>
                </div>

                <button onClick={abrirNuevo} className="bg-blue-900 text-white px-5 py-3 rounded-lg font-bold">
                    + Nueva categoría
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-blue-950 text-white">
                        <tr>
                            <th className="p-3 text-left">ID</th>
                            <th className="p-3 text-left">Nombre</th>
                            <th className="p-3 text-left">Descripción</th>
                            <th className="p-3 text-left">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {categorias.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-slate-50">
                                <td className="p-3">{item.id}</td>
                                <td className="p-3">{item.nombre}</td>
                                <td className="p-3">{item.descripcion}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => abrirEditar(item)} className="bg-yellow-400 px-3 py-2 rounded font-bold">
                                        Editar
                                    </button>
                                    <button onClick={() => eliminar(item.id)} className="bg-red-500 text-white px-3 py-2 rounded font-bold">
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                    <form onSubmit={guardar} className="bg-white w-full max-w-md rounded-xl p-6 relative">
                        <button type="button" onClick={() => setModal(false)} className="absolute top-3 right-4 text-2xl font-bold">
                            ×
                        </button>

                        <h3 className="text-2xl font-bold text-blue-950 mb-5">
                            {editando ? "Editar categoría" : "Nueva categoría"}
                        </h3>

                        <input
                            type="text"
                            placeholder="Nombre"
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            className="w-full border px-4 py-3 rounded mb-3"
                            required
                        />

                        <textarea
                            placeholder="Descripción"
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            className="w-full border px-4 py-3 rounded mb-4"
                            required
                        />

                        <button className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold">
                            Guardar
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CategoriasPanel;