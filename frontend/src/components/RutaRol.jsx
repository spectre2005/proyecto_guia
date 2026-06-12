import { Navigate } from "react-router-dom";

const RutaRol = ({ children, rolesPermitidos }) => {
    const usuario = JSON.parse(localStorage.getItem("usuario"));

    const rol = usuario?.role?.nombre;

    if (!usuario) {
        return <Navigate to="/" />;
    }

    if (!rolesPermitidos.includes(rol)) {
        return (
            <Navigate
                to={["Administrador", "Vendedor"].includes(rol) ? "/panel" : "/"}
                replace
            />
        );
    }

    return children;
};

export default RutaRol;
