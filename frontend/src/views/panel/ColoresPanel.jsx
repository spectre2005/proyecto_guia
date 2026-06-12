import { useEffect, useState } from "react";
import clienteAxios from "../../config/axios";

const ColoresPanel = () => {
    const [colores, setColores] = useState([]);
    const [modal, setModal] = useState(false);
    const [editando, setEditando] = useState(null);

    const [form, setForm] = useState({
        nombre: "",
        codigo_hex: "#000000",
    });

    const obtenerColores = async () => {
        const { data } = await clienteAxios.get("/colores");
        setColores(Array.isArray(data) ? data : data.data || []);
    };

    useEffect(() => {
        obtenerColores();
    }, []);

    const abrirNuevo = () => {
        setEditando(null);
        setForm({ nombre: "", codigo_hex: "#000000" });
        setModal(true);
    };

    const abrirEditar = (item) => {
        setEditando(item);
        setForm({
            nombre: item.nombre || "",
            codigo_hex: item.codigo_hex || "#000000",
        });
        setModal(true);
    };

    const guardar = async (e) => {
        e.preventDefault();

        try {
            if (editando) {
                await clienteAxios.put(`/colores/${editando.id}`, form);
            } else {
                await clienteAxios.post("/colores", form);
            }

            setModal(false);
            obtenerColores();
        } catch (error) {
            console.log(error);
            alert("Error al guardar color");
        }
    };

    const eliminar = async (id) => {
        if (!confirm("¿Eliminar este color?")) return;

        try {
            await clienteAxios.delete(`/colores/${id}`);
            obtenerColores();
        } catch (error) {
            console.log(error);
            alert("Error al eliminar color");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-4xl font-bold text-blue-950">Colores</h2>
                    <p className="text-gray-600 mt-2">Gestiona colores de productos.</p>
                </div>

                <button onClick={abrirNuevo} className="bg-blue-900 text-white px-5 py-3 rounded-lg font-bold">
                    + Nuevo color
                </button>
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-blue-950 text-white">
                        <tr>
                            <th className="p-3 text-left">ID</th>
                            <th className="p-3 text-left">Color</th>
                            <th className="p-3 text-left">Código HEX</th>
                            <th className="p-3 text-left">Vista</th>
                            <th className="p-3 text-left">Acciones</th>
                        </tr>
                    </thead>

                    <tbody>
                        {colores.map((item) => (
                            <tr key={item.id} className="border-b hover:bg-slate-50">
                                <td className="p-3">{item.id}</td>
                                <td className="p-3">{item.nombre}</td>
                                <td className="p-3">{item.codigo_hex}</td>
                                <td className="p-3">
                                    <div
                                        className="w-8 h-8 rounded-full border"
                                        style={{ backgroundColor: item.codigo_hex }}
                                    ></div>
                                </td>
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
                            {editando ? "Editar color" : "Nuevo color"}
                        </h3>

                        <input
                            type="text"
                            placeholder="Nombre del color"
                            value={form.nombre}
                            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                            className="w-full border px-4 py-3 rounded mb-3"
                            required
                        />

                        <input
                            type="color"
                            value={form.codigo_hex}
                            onChange={(e) => setForm({ ...form, codigo_hex: e.target.value })}
                            className="w-full border px-4 py-3 rounded mb-4 h-14"
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

export default ColoresPanel;