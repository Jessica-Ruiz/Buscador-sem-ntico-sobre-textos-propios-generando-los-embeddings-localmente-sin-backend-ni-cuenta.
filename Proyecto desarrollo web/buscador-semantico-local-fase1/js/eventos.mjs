
import {
    mostrarDocumentos,
    actualizarEstadisticas,
    mostrarEstado,
    mostrarEstadoDocumentos,
    mostrarResultados,
    mostrarSinResultados,
    limpiarResultados,
    establecerEstadoModelo
} from "./interfaz.mjs";
import {
    procesarArchivos,
    obtenerDocumentos,
    eliminarDocumento
} from "./documentos.mjs";



import {
    cargarModelo
} from "./embeddings.mjs";

import {
    buscarSemantico
} from "./buscador.mjs";

import { guardarConfiguracion } from "./almacenamiento.mjs";
import { enviarConsulta } from "./api.mjs";



const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const searchForm = document.querySelector("#searchForm");
const busqueda = document.querySelector("#busqueda");
const cantidadResultados = document.querySelector("#cantidadResultados");
const umbral = document.querySelector("#umbral");
const valorUmbral = document.querySelector("#valorUmbral");
const listaDocumentos = document.querySelector("#listaDocumentos");
const btnBorrarDatos = document.querySelector("#btnBorrarDatos");

// Elementos de la interfaz de progreso.
const progresoCarga = document.querySelector("#progresoCarga");
const etapaCarga = document.querySelector("#etapaCarga");
const porcentajeCarga = document.querySelector("#porcentajeCarga");
const barraProgreso = document.querySelector("#barraProgreso");
const barraProgresoValor = document.querySelector("#barraProgresoValor");
const btnCancelarCarga = document.querySelector("#btnCancelarCarga");

// Controlador para cancelar el procesamiento.
let controladorCarga = null;
const EXTENSIONES_PERMITIDAS = new Set([
    "txt",
    "md",
    "csv",
    "json",
    "pdf"
]);

export function configurarEventos() {
    const ultimaConsulta = sessionStorage.getItem("ultimaConsulta");

    if (ultimaConsulta) {
        busqueda.value = ultimaConsulta;
    }
    fileInput.addEventListener(
        "change",
        manejarSeleccionArchivos
    );

    dropZone.addEventListener(
        "click",
        manejarClickZona
    );

    dropZone.addEventListener(
        "keydown",
        manejarTecladoZona
    );

    dropZone.addEventListener(
        "dragover",
        manejarDragOver
    );

    dropZone.addEventListener(
        "dragleave",
        manejarDragLeave
    );

    dropZone.addEventListener(
        "drop",
        manejarDrop
    );

    searchForm.addEventListener(
        "submit",
        manejarBusqueda
    );

    umbral.addEventListener(
        "input",
        manejarCambioUmbral
    );
    
    cantidadResultados.addEventListener(
        "change",
        guardarPreferencias
    );


    listaDocumentos.addEventListener(
        "click",
        manejarAccionesDocumentos
    );
    // Permite cancelar el procesamiento de documentos.
    btnCancelarCarga.addEventListener(
        "click",
        cancelarProcesamiento
    );
    btnBorrarDatos.addEventListener(
    "click",
    borrarDatosGuardados
    );

    // Carga el modelo al iniciar.
    prepararModelo();
}
/**
 * Cancela el procesamiento de los documentos.
 */
function cancelarProcesamiento() {
    if (!controladorCarga) {
        return;
    }

    controladorCarga.abort();

    etapaCarga.textContent =
        "Cancelando procesamiento...";

    btnCancelarCarga.disabled = true;
}
/**
 * Actualiza la información visual del procesamiento.
 */
function actualizarProgreso(etapa, porcentaje = null) {
    progresoCarga.classList.remove("hidden");

    etapaCarga.textContent = etapa;

    if (porcentaje === null) {
        porcentajeCarga.textContent = "—";
        barraProgreso.setAttribute(
            "aria-valuenow",
            "0"
        );
        barraProgresoValor.style.width = "0%";
        return;
    }

    const valor = Math.max(
        0,
        Math.min(100, Math.round(porcentaje))
    );

    porcentajeCarga.textContent = `${valor}%`;

    barraProgreso.setAttribute(
        "aria-valuenow",
        String(valor)
    );

    barraProgresoValor.style.width = `${valor}%`;
}
/**
 * Carga el modelo de embeddings.
 */
async function prepararModelo() {
    establecerEstadoModelo(
        "Cargando modelo de embeddings...",
        "warning"
    );

    try {
        await cargarModelo((evento) => {
            if (
                evento?.status === "progress" &&
                Number.isFinite(evento.progress)
            ) {
                const porcentaje = Math.round(
                    evento.progress
                );

                establecerEstadoModelo(
                    `Cargando modelo ${porcentaje}%`,
                    "warning"
                );
            }
        });

        establecerEstadoModelo(
            "Modelo listo · embeddings locales",
            "success"
        );

    } catch (error) {
        console.error(
            "Error cargando el modelo:",
            error
        );

        establecerEstadoModelo(
            `No se pudo cargar el modelo: ${obtenerMensajeError(error)}`,
            "error"
        );
    }
}

/**
 * Obtiene un mensaje legible de cualquier tipo de error.
 */
function obtenerMensajeError(error) {
    if (!error) {
        return "Error desconocido.";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error) {
        return error.message || error.name || "Error desconocido.";
    }

    if (error.message) {
        return String(error.message);
    }

    if (error.reason) {
        return String(error.reason);
    }

    if (error.error) {
        if (typeof error.error === "string") {
            return error.error;
        }

        if (error.error.message) {
            return String(error.error.message);
        }
    }

    try {
        const convertido = JSON.stringify(error);

        if (
            convertido &&
            convertido !== "{}" &&
            convertido !== "null"
        ) {
            return convertido;
        }
    } catch {
        // Continúa con el mensaje genérico.
    }

    return "Error desconocido.";
}

/**
 * Abre el selector de archivos.
 */
function manejarClickZona(event) {
    if (event.target.closest("label")) {
        return;
    }

    fileInput.click();
}

/**
 * Permite abrir el selector con Enter o espacio.
 */
function manejarTecladoZona(event) {
    if (
        event.key === "Enter" ||
        event.key === " "
    ) {
        event.preventDefault();
        fileInput.click();
    }
}

/**
 * Permite arrastrar archivos sobre la zona.
 */
function manejarDragOver(event) {
    event.preventDefault();

    dropZone.classList.add("dragover");
}

/**
 * Quita el estado de arrastre.
 */
function manejarDragLeave() {
    dropZone.classList.remove("dragover");
}

/**
 * Procesa archivos soltados.
 */
async function manejarDrop(event) {
    event.preventDefault();

    dropZone.classList.remove("dragover");

    const archivos = Array.from(
        event.dataTransfer.files
    );

    await procesarListaDeArchivos(archivos);
}

/**
 * Procesa archivos seleccionados.
 */
async function manejarSeleccionArchivos(event) {
    const archivos = Array.from(
        event.target.files
    );

    await procesarListaDeArchivos(archivos);

    event.target.value = "";
}


/**
 * Procesa archivos y controla el progreso y la cancelación.
 */
async function procesarListaDeArchivos(archivos) {
    if (archivos.length === 0) {
        return;
    }

    // Evitar iniciar otro procesamiento simultáneamente.
    if (controladorCarga) {
        mostrarEstadoDocumentos(
            "Ya hay un procesamiento en curso.",
            "warning"
        );
        return;
    }

    // Validar las extensiones permitidas.
    const archivosValidos = archivos.filter(
        esArchivoValido
    );

    const hayArchivosInvalidos =
        archivosValidos.length !== archivos.length;

    if (archivosValidos.length === 0) {
        mostrarEstadoDocumentos(
            "No se encontraron archivos compatibles. Utiliza TXT, MD, CSV, JSON o PDF.",
            "warning"
        );
        return;
    }

    // Crear el controlador de cancelación.
    controladorCarga = new AbortController();
    const signal = controladorCarga.signal;

    fileInput.disabled = true;
    btnCancelarCarga.disabled = false;

    // Limpiar mensajes del procesamiento anterior.
    const mensajeDocumentos =
        document.getElementById("mensajeDocumentos");

    if (mensajeDocumentos) {
        mensajeDocumentos.className = "alert d-none mt-3";
        mensajeDocumentos.textContent = "";
    }

    // Reiniciar el progreso.
    actualizarProgreso("Preparando documentos...", 0);

    if (hayArchivosInvalidos) {
        mostrarEstadoDocumentos(
            "Se ignoraron archivos con formatos no compatibles. Procesando los archivos válidos...",
            "warning"
        );
    } else {
        mostrarEstadoDocumentos(
            "Iniciando procesamiento de documentos...",
            "warning"
        );
    }

    try {
        console.log("DIAGNÓSTICO: Iniciando procesarArchivos");
        await procesarArchivos(
            archivosValidos,
            {
                signal,

                onStage: (etapa) => {
                    actualizarProgreso(etapa);
                },

                onReadProgress: (porcentaje) => {
                    actualizarProgreso(
                        "Leyendo archivo...",
                        porcentaje
                    );

                    mostrarEstadoDocumentos(
                        `Leyendo archivo: ${Math.round(porcentaje)}%`,
                        "warning"
                    );
                },

                onEmbeddingProgress: (evento) => {
                    if (
                        evento?.status === "embedding" &&
                        Number.isFinite(evento.progress)
                    ) {
                        const porcentaje =
                            evento.progress * 100;

                        actualizarProgreso(
                            "Generando embeddings del archivo actual...",
                            porcentaje
                        );

                        mostrarEstadoDocumentos(
                            `Generando embeddings: ${Math.round(porcentaje)}%`,
                            "warning"
                        );
                    }
                }
            }
        );
        console.log("DIAGNÓSTICO: procesarArchivos terminó correctamente");

        // Procesamiento finalizado correctamente.
        actualizarProgreso(
            "Procesamiento completado.",
            100
        );

        const documentos = obtenerDocumentos();

        mostrarDocumentos(documentos);
        actualizarEstadisticas(documentos);

        establecerEstadoModelo(
            "Modelo listo · embeddings locales",
            "success"
        );

        mostrarEstadoDocumentos(
            "Documentos procesados correctamente.",
            "success"
        );

    } catch (error) {
        console.error(
            "Error completo al procesar documentos:",
            error
        );

        if (
            error?.name === "AbortError" ||
            signal.aborted
        ) {
            // Procesamiento cancelado.
            actualizarProgreso(
                "Procesamiento cancelado.",
                0
            );

            mostrarEstadoDocumentos(
                "Procesamiento cancelado. Los documentos completados se conservaron.",
                "warning"
            );

        } else {
            // Error durante el procesamiento.
            actualizarProgreso(
                "Error durante el procesamiento.",
                0
            );

            const mensaje = obtenerMensajeError(error);

            mostrarEstadoDocumentos(
                `No se pudieron procesar los documentos: ${mensaje}`,
                "error"
            );
        }

    } finally {
        // Restablecer controles.
        controladorCarga = null;
        fileInput.disabled = false;
        btnCancelarCarga.disabled = true;
    }
}


/**
 * Verifica si el archivo tiene una extensión permitida.
 */
function esArchivoValido(file) {
    const extension =
        obtenerExtension(file.name);

    return EXTENSIONES_PERMITIDAS.has(
        extension
    );
}

/**
 * Obtiene la extensión de un archivo.
 */
function obtenerExtension(nombre) {
    const partes =
        nombre.toLowerCase().split(".");

    return partes.length > 1
        ? partes.pop()
        : "";
}

/**
 * Realiza una búsqueda semántica.
 */
async function manejarBusqueda(event) {
    event.preventDefault();

    const consulta =
        busqueda.value.trim();

    if (consulta.length === 0) {
        mostrarEstado(
            "Escribe una consulta para comenzar.",
            "warning"
        );

        busqueda.focus();

        return;
    }

    const documentos =
        obtenerDocumentos();

    if (documentos.length === 0) {
        mostrarEstado(
            "Carga al menos un documento antes de buscar.",
            "warning"
        );

        return;
    }
    // Guardar temporalmente la última consulta de la sesión.
    sessionStorage.setItem("ultimaConsulta", consulta); 

    const cantidad =
        Number(cantidadResultados.value);

    const valor =
        Number(umbral.value);

    mostrarEstado(
        "Generando embedding de la consulta...",
        "warning"
    );

    try {
        // Enviar la consulta al servidor Express.
        const respuestaServidor =
            await enviarConsulta(consulta);

        console.info(
            "Respuesta del servidor:",
            respuestaServidor
        );

        // Ejecutar la búsqueda semántica local.
        const resultados =
            await buscarSemantico(
                consulta,
                documentos,
                cantidad,
                valor
            );

            
        if (resultados.length === 0) {
            mostrarSinResultados();

        mostrarEstado(
            "Búsqueda completada. No se encontraron resultados que cumplan con el umbral de similitud.",
            "warning"
        );

} else {
    mostrarResultados(resultados);

    mostrarEstado(
        `Búsqueda completada correctamente. Se encontraron ${resultados.length} resultados.`,
        "success"
    );
}


        establecerEstadoModelo(
            "Modelo listo · búsqueda local",
            "success"
        );

        guardarConfiguracion({
            cantidadResultados: cantidad,
            umbral: valor
        });

    } catch (error) {
        console.error(
            "Error realizando búsqueda:",
            error
        );

        const mensaje =
            obtenerMensajeError(error);

        mostrarEstado(
            `No se pudo realizar la búsqueda: ${mensaje}`,
            "error"
        );
    }
}

/**
 * Actualiza el valor visible del umbral.
 */
function manejarCambioUmbral() {
    const valor =
        Number(umbral.value);

    valorUmbral.value =
        valor.toFixed(2);

    guardarPreferencias();
}
/**
 * Guarda las preferencias actuales de búsqueda.
 */
function guardarPreferencias() {
    guardarConfiguracion({
        cantidadResultados: Number(cantidadResultados.value),
        umbral: Number(umbral.value)
    });
}


/**
 * Maneja las acciones de los documentos.
 */
function manejarAccionesDocumentos(event) {
    const boton =
        event.target.closest(
            "[data-eliminar-documento]"
        );

    if (!boton) {
        return;
    }

    eliminarDocumento(
        boton.dataset.eliminarDocumento
    );

    const documentos =
        obtenerDocumentos();

    mostrarDocumentos(documentos);
    actualizarEstadisticas(documentos);
    limpiarResultados();

    mostrarEstado(
        "Documento eliminado.",
        "success"
    );
}


/**
 * Elimina las preferencias y la última consulta guardadas.
 */
function borrarDatosGuardados() {
    const confirmar = window.confirm(
        "¿Deseas borrar las preferencias y la última consulta guardada?"
    );

    if (!confirmar) {
        return;
    }

    // Eliminar datos del almacenamiento.
    localStorage.removeItem("semanticSearchLocal.config");
    sessionStorage.removeItem("ultimaConsulta");

    // Restablecer las preferencias.
    cantidadResultados.value = "5";
    umbral.value = "0.30";
    valorUmbral.value = "0.30";

    // Limpiar la pregunta.
    busqueda.value = "";

    // Limpiar los resultados visibles.
    limpiarResultados();

    // Informar al usuario.
    mostrarEstado(
        "Datos guardados eliminados correctamente.",
        "success"
    );
}

