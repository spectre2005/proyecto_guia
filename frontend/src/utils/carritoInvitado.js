const CLAVE_CARRITO_INVITADO = "carrito_invitado";

export const obtenerCarritoInvitado = () => {
    try {
        const carrito = JSON.parse(
            localStorage.getItem(CLAVE_CARRITO_INVITADO)
        );

        return Array.isArray(carrito) ? carrito : [];
    } catch {
        return [];
    }
};

const guardarCarritoInvitado = (detalles) => {
    localStorage.setItem(
        CLAVE_CARRITO_INVITADO,
        JSON.stringify(detalles)
    );
    window.dispatchEvent(new Event("carrito-invitado-actualizado"));
    return detalles;
};

export const agregarAlCarritoInvitado = (
    producto,
    stock,
    cantidad = 1
) => {
    const detalles = obtenerCarritoInvitado();
    const existente = detalles.find(
        (detalle) => detalle.stocks_id === stock.id
    );
    const cantidadSolicitada = Number(cantidad);

    if (existente) {
        if (
            existente.cantidad + cantidadSolicitada >
            Number(stock.cantidad)
        ) {
            throw new Error("La cantidad supera el stock disponible.");
        }

        existente.cantidad += cantidadSolicitada;
        existente.precio = Number(stock.precio);
        existente.stock = {
            ...existente.stock,
            ...stock,
            producto,
        };
    } else {
        detalles.push({
            id: `invitado-${stock.id}`,
            stocks_id: stock.id,
            cantidad: cantidadSolicitada,
            precio: Number(stock.precio),
            stock: {
                ...stock,
                producto,
            },
        });
    }

    return guardarCarritoInvitado(detalles);
};

export const actualizarCarritoInvitado = (stockId, cantidad) => {
    const detalles = obtenerCarritoInvitado();
    const detalle = detalles.find(
        (item) => item.stocks_id === stockId
    );

    if (!detalle) return detalles;

    if (cantidad > Number(detalle.stock?.cantidad || 0)) {
        throw new Error("La cantidad supera el stock disponible.");
    }

    detalle.cantidad = cantidad;
    return guardarCarritoInvitado(detalles);
};

export const eliminarDelCarritoInvitado = (stockId) =>
    guardarCarritoInvitado(
        obtenerCarritoInvitado().filter(
            (detalle) => detalle.stocks_id !== stockId
        )
    );

export const vaciarCarritoInvitado = () =>
    guardarCarritoInvitado([]);

export const contarCarritoInvitado = () =>
    new Set(
        obtenerCarritoInvitado()
            .map((detalle) => detalle.stock?.producto?.id)
            .filter(Boolean)
    ).size;

export const fusionarCarritoInvitado = async (clienteAxios) => {
    const detalles = obtenerCarritoInvitado();
    const pendientes = [];
    let fusionados = 0;

    for (const detalle of detalles) {
        try {
            await clienteAxios.post("/mi-carrito/items", {
                stocks_id: detalle.stocks_id,
                cantidad: detalle.cantidad,
            });
            fusionados += 1;
        } catch {
            pendientes.push(detalle);
        }
    }

    guardarCarritoInvitado(pendientes);

    return {
        fusionados,
        pendientes: pendientes.length,
    };
};
