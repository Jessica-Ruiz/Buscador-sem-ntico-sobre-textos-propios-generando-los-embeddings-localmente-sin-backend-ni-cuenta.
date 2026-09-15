import { configurarEventos } from "./eventos.mjs";
import { inicializarInterfaz } from "./interfaz.mjs";
import { cargarConfiguracion } from "./almacenamiento.mjs";

/**
 * Punto de entrada de la aplicación.
 */
function iniciarAplicacion() {
    const configuracion = cargarConfiguracion();

    inicializarInterfaz(configuracion);
    configurarEventos();

    console.info("SemanticSearch Local iniciado.");
}

document.addEventListener("DOMContentLoaded", iniciarAplicacion);
