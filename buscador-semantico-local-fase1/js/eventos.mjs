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

const fileInput = document.querySelector("#fileInput");
const dropZone = document.querySelector("#dropZone");
const searchForm = document.querySelector("#searchForm");
const busqueda = document.querySelector("#busqueda");
const cantidadResultados = document.querySelector("#cantidadResultados");
const umbral = document.querySelector("#umbral");
const valorUmbral = document.querySelector("#valorUmbral");
const listaDocumentos = document.querySelector("#listaDocumentos");

const EXTENSIONES_PERMITIDAS = new Set([
    "txt",
    "md",
    "csv",
    "json",
    "pdf"
]);

export function configurarEventos() {
    fileInput.addEventListener("change", manejarSeleccionArchivos);

    dropZone.addEventListener("click", manejarClickZona);
    dropZone.addEventListener("keydown", manejarTecladoZona);
    dropZone.addEventListener("dragover", manejarDragOver);
    dropZone.addEventListener("dragleave", manejarDragLeave);
    dropZone.addEventListener("drop", manejarDrop);

    searchForm.addEventListener("submit", manejarBusqueda);

    umbral.addEventListener("input", manejarCambioUmbral);

    listaDocumentos.addEventListener(
        "click",
        manejarAccionesDocumentos
    );

    // Carga el modelo al iniciar para que el usuario vea su estado.
    prepararModelo();
}

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
        console.error("Error cargando modelo:", error);

        establecerEstadoModelo(
            "No se pudo cargar el modelo",
            "error"
        );
    }
}

function manejarClickZona(event) {
    if (event.target.closest("label")) {
        return;
    }

    fileInput.click();
}

function manejarTecladoZona(event) {
    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        fileInput.click();
    }
}

function manejarDragOver(event) {
    event.preventDefault();
    dropZone.classList.add("dragover");
}

function manejarDragLeave() {
    dropZone.classList.remove("dragover");
}

async function manejarDrop(event) {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const archivos = Array.from(event.dataTransfer.files);
    await procesarListaDeArchivos(archivos);
}

async function manejarSeleccionArchivos(event) {
    const archivos = Array.from(event.target.files);
    await procesarListaDeArchivos(archivos);

    event.target.value = "";
}

async function procesarListaDeArchivos(archivos) {
    if (archivos.length === 0) {
        return;
    }

    const archivosValidos = archivos.filter(esArchivoValido);

    if (archivosValidos.length !== archivos.length) {
        mostrarEstado(
            "Se ignoraron archivos con formatos no compatibles.",
            "warning"
        );
    }

    if (archivosValidos.length === 0) {
        return;
    }

    mostrarEstado(
        "Generando embeddings de los documentos...",
        "warning"
    );

    try {
        await procesarArchivos(archivosValidos, {
            onEmbeddingProgress: (evento) => {
                if (
                    evento?.status === "embedding" &&
                    Number.isFinite(evento.progress)
                ) {
                    const porcentaje = Math.round(
                        evento.progress * 100
                    );

                    mostrarEstado(
                        `Generando embeddings ${porcentaje}%...`,
                        "warning"
                    );
                }
            }
        });

        const documentos = obtenerDocumentos();

        mostrarDocumentos(documentos);
        actualizarEstadisticas(documentos);

        establecerEstadoModelo(
            "Modelo listo · embeddings locales",
            "success"
        );

    } catch (error) {
        console.error(error);

        mostrarEstado(
            `No se pudieron procesar los documentos: ${error.message}`,
            "error"
        );
    }
}

function esArchivoValido(file) {
    const extension = obtenerExtension(file.name);
    return EXTENSIONES_PERMITIDAS.has(extension);
}

function obtenerExtension(nombre) {
    const partes = nombre.toLowerCase().split(".");
    return partes.length > 1 ? partes.pop() : "";
}

async function manejarBusqueda(event) {
    event.preventDefault();

    const consulta = busqueda.value.trim();

    if (consulta.length === 0) {
        mostrarEstado(
            "Escribe una consulta para comenzar.",
            "warning"
        );
        busqueda.focus();
        return;
    }

    const documentos = obtenerDocumentos();

    if (documentos.length === 0) {
        mostrarEstado(
            "Carga al menos un documento antes de buscar.",
            "warning"
        );
        return;
    }

    const cantidad = Number(cantidadResultados.value);
    const valor = Number(umbral.value);

    mostrarEstado(
        "Generando embedding de la consulta...",
        "warning"
    );

    try {
        const resultados = await buscarSemantico(
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
        console.error(error);

        mostrarEstado(
            `No se pudo realizar la búsqueda: ${error.message}`,
            "error"
        );
    }
}

function manejarCambioUmbral() {
    const valor = Number(umbral.value);
    valorUmbral.value = valor.toFixed(2);

    guardarConfiguracion({
        cantidadResultados: Number(cantidadResultados.value),
        umbral: valor
    });
}

function manejarAccionesDocumentos(event) {
    const boton = event.target.closest(
        "[data-eliminar-documento]"
    );

    if (!boton) {
        return;
    }

    eliminarDocumento(
        boton.dataset.eliminarDocumento
    );

    const documentos = obtenerDocumentos();

    mostrarDocumentos(documentos);
    actualizarEstadisticas(documentos);
    limpiarResultados();

    mostrarEstado(
        "Documento eliminado.",
        "success"
    );
}
