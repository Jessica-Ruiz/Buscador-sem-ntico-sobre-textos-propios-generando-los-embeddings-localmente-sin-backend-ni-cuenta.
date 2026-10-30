
// Dirección base del backend.
const API_BASE_URL = window.location.origin;

/**
 * Consulta el estado del servidor.
 */
export async function consultarEstadoServidor() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/estado`
        );

        if (!response.ok) {
            throw new Error(
                `Error HTTP: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {
        console.error(
            "Error de conexión con el servidor:",
            error
        );

        throw error;
    }
}

/**
 * Envía una consulta al backend.
 */
export async function enviarConsulta(consulta) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/consulta`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ consulta })
            }
        );

        if (!response.ok) {
            throw new Error(
                `Error HTTP: ${response.status}`
            );
        }

        return await response.json();

    } catch (error) {
        console.error(
            "Error enviando la consulta:",
            error
        );

        throw error;
    }
}
