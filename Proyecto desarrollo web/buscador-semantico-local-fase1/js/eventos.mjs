
import {
    procesarArchivos,
    obtenerDocumentos,
    eliminarDocumento
} from "./documentos.mjs";

import {
    mostrarDocumentos,
    actualizarEstadisticas,
    mostrarEstado,
    mostrarResultados,
    mostrarSinResultados,
    limpiarResultados,
    establecerEstadoModelo
} from "./interfaz.mjs";

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

    listaDocumentos.addEventListener(
        "click",
        manejarAccionesDocumentos
    );
    // Permite cancelar el procesamiento de documentos.
    btnCancelarCarga.addEventListener(
        "click",
        cancelarProcesamiento
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

                actualizarProgreso(
                    "Descargando modelo de embeddings...",
                    porcentaje
                );
            }
        });

        establecerEstadoModelo(
            "Modelo listo · embeddings locales",
            "success"
        );

        actualizarProgreso(
            "Modelo listo. Esperando documentos...",
            100
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
 * Procesa la lista de archivos.
 */
/**
 * Procesa archivos y controla el progreso y la cancelación.
 */
async function procesarListaDeArchivos(archivos) {
    if (archivos.length === 0) {
        return;
    }

    // Evitar iniciar otro procesamiento simultáneamente.
    if (controladorCarga) {
        mostrarEstado(
            "Ya hay un procesamiento en curso.",
            "warning"
        );
        return;
    }

    const archivosValidos = archivos.filter(
        esArchivoValido
    );

    if (archivosValidos.length !== archivos.length) {
        mostrarEstado(
            "Se ignoraron archivos con formatos no compatibles.",
            "warning"
        );
    }

    if (archivosValidos.length === 0) {
        return;
    }

    controladorCarga = new AbortController();

    const signal = controladorCarga.signal;

    fileInput.disabled = true;
    btnCancelarCarga.disabled = false;

    actualizarProgreso("Preparando documentos...", 0);

    mostrarEstado(
        "Iniciando procesamiento de documentos...",
        "warning"
    );

    try {
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

                mostrarEstado(
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

                        mostrarEstado(
                            `Generando embeddings: ${Math.round(porcentaje)}%`,
                            "warning"
                        );
                    }
                }
            }
        );

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

        mostrarEstado(
            "Documentos procesados correctamente.",
            "success"
        );

    } catch (error) {
        console.error(
            "Error completo al procesar documentos:",
            error
        );

        if (
            error.name === "AbortError" ||
            signal.aborted
        ) {
            actualizarProgreso(
                "Procesamiento cancelado.",
                0
            );

            mostrarEstado(
                "Procesamiento cancelado. Los documentos completados se conservaron.",
                "warning"
            );

        } else {
            actualizarProgreso(
                "Error durante el procesamiento.",
                0
            );

            const mensaje = obtenerMensajeError(error);

            mostrarEstado(
                `No se pudieron procesar los documentos: ${mensaje}`,
                "error"
            );
        }

    } finally {
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
        } else {
            mostrarResultados(resultados);
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

    guardarConfiguracion({
        cantidadResultados:
            Number(
                cantidadResultados.value
            ),
        umbral: valor
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

