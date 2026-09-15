const CLAVE_CONFIGURACION = "semanticSearchLocal.config";

/**
 * Guarda solamente preferencias de interfaz.
 *
 * No se almacenan documentos ni información sensible.
 */
export function guardarConfiguracion(configuracion) {
    try {
        localStorage.setItem(
            CLAVE_CONFIGURACION,
            JSON.stringify(configuracion)
        );
    } catch (error) {
        console.warn(
            "No se pudo guardar la configuración local:",
            error
        );
    }
}

/**
 * Recupera las preferencias de interfaz.
 */
export function cargarConfiguracion() {
    try {
        const datos = localStorage.getItem(CLAVE_CONFIGURACION);

        if (!datos) {
            return null;
        }

        return JSON.parse(datos);
    } catch (error) {
        console.warn(
            "No se pudo leer la configuración local:",
            error
        );

        return null;
    }
}
