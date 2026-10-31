import {
    extraerTextoPDF,
    generarEmbeddings
} from "./embeddings.mjs";

/**
 * Almacén temporal en memoria.
 */
const documentos = [];

/**
 * Procesa una lista de archivos y genera sus embeddings.
 */
export async function procesarArchivos(archivos, opciones = {}) {
    for (const archivo of archivos) {
        comprobarCancelacion(opciones.signal);

        const documento = await procesarArchivo(
            archivo,
            opciones
        );

        comprobarCancelacion(opciones.signal);

        const existente = documentos.find(
            (item) => item.nombre === documento.nombre
        );

        if (existente) {
            const indice = documentos.indexOf(existente);
            documentos[indice] = documento;
        } else {
            documentos.push(documento);
        }
    }

    return documentos;
}
/**
 * Lee un archivo de texto e informa cuánto se ha leído.
 */
function leerArchivoConProgreso(file, onProgress, signal) {
    return new Promise((resolve, reject) => {
        const lector = new FileReader();

        const limpiar = () => {
            signal?.removeEventListener("abort", cancelar);
        };

        const cancelar = () => {
            lector.abort();
        };

        if (signal?.aborted) {
            const error = new Error("Lectura cancelada.");
            error.name = "AbortError";
            reject(error);
            return;
        }

        lector.onload = () => {
            limpiar();
            resolve(lector.result);
        };

        lector.onerror = () => {
            limpiar();
            reject(lector.error || new Error("Error al leer el archivo."));
        };

        lector.onabort = () => {
            limpiar();

            const error = new Error("Lectura cancelada.");
            error.name = "AbortError";

            reject(error);
        };

        lector.onprogress = (evento) => {
            if (
                evento.lengthComputable &&
                typeof onProgress === "function"
            ) {
                onProgress(
                    (evento.loaded / evento.total) * 100
                );
            }
        };

        signal?.addEventListener("abort", cancelar, { once: true });

        lector.readAsText(file);
    });
}

async function procesarArchivo(file, opciones = {}) {
    // Extensiones permitidas.
    const extensionesPermitidas = [
        "txt",
        "md",
        "csv",
        "json",
        "pdf"
    ];

    // Validar nombre del archivo.
    if (
        !file ||
        typeof file.name !== "string" ||
        file.name.trim().length === 0
    ) {
        throw new Error("El archivo no tiene un nombre válido.");
    }

    const extension = obtenerExtension(file.name);

    // Validar formato.
    if (!extensionesPermitidas.includes(extension)) {
        throw new Error(`Formato no permitido: .${extension}`);
    }

    // Limitar tamaño a 10 MB.
    const TAMANIO_MAXIMO = 10 * 1024 * 1024;

    if (file.size > TAMANIO_MAXIMO) {
        throw new Error(
            `${file.name} supera el límite permitido de 10 MB.`
        );
    }


    comprobarCancelacion(opciones.signal);

    let contenido = "";
    let paginas = 0;

    if (typeof opciones.onStage === "function") {
        opciones.onStage("Leyendo archivo...");
    }

    switch (extension) {
        case "txt":
        case "md":
        case "csv":
        case "json":
            contenido = await leerArchivoConProgreso(
                file,
                (porcentaje) => {
                    if (typeof opciones.onReadProgress === "function") {
                        opciones.onReadProgress(porcentaje);
                    }
                },
                opciones.signal
            );
            break;

        case "pdf": {
            const resultado = await extraerTextoPDF(file);
            contenido = resultado.texto;
            paginas = resultado.paginas;
            break;
        }

        default:
            throw new Error(`Formato no soportado: .${extension}`);
    }
    comprobarCancelacion(opciones.signal);

    
if (contenido.trim().length === 0) {
    throw new Error(`${file.name} no contiene texto extraíble.`);
}

// Limitar el contenido procesado por documento.
const LIMITE_CARACTERES = 2_000_000;

if (contenido.length > LIMITE_CARACTERES) {
    throw new Error(
        `${file.name} supera el límite de 2 millones de caracteres.`
    );
}


    const fragmentosTexto = dividirEnFragmentos(contenido);

    const fragmentos = fragmentosTexto.map((texto, indice) => ({
        id: `${crearId()}-${indice}`,
        documento: file.name,
        texto,
        indice,
        embedding: null
    }));

    if (typeof opciones.onStage === "function") {
        opciones.onStage("Generando embeddings...");
    }

    const embeddings = await generarEmbeddings(
        fragmentos.map((fragmento) => fragmento.texto),
        opciones.onEmbeddingProgress,
        opciones.signal
    );

    comprobarCancelacion(opciones.signal);

    for (let indice = 0; indice < fragmentos.length; indice += 1) {
        fragmentos[indice].embedding = embeddings[indice];
    }

    return {
        id: crearId(),
        nombre: file.name,
        extension,
        tamanio: file.size,
        contenido,
        paginas,
        fragmentos
    };
}
/**
 * Detiene el procesamiento cuando se solicita una cancelación.
 */
function comprobarCancelacion(signal) {
    if (signal?.aborted) {
        const error = new Error(
            "El procesamiento fue cancelado por el usuario."
        );

        error.name = "AbortError";

        throw error;
    }
}

/**
 * Divide por párrafos y, cuando un párrafo es muy largo, lo divide
 * en bloques de aproximadamente 900 caracteres.
 */
export function dividirEnFragmentos(texto) {
    const parrafos = texto
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)
        .map((parrafo) => parrafo.trim())
        .filter((parrafo) => parrafo.length > 0);

    const resultado = [];

    for (const parrafo of parrafos) {
        if (parrafo.length <= 900) {
            resultado.push(parrafo);
            continue;
        }

        for (let inicio = 0; inicio < parrafo.length; inicio += 750) {
            const bloque = parrafo.slice(inicio, inicio + 900).trim();

            if (bloque.length > 0) {
                resultado.push(bloque);
            }
        }
    }

    return resultado.length > 0
        ? resultado
        : [texto.trim()];
}

export function obtenerDocumentos() {
    return [...documentos];
}

export function eliminarDocumento(id) {
    const indice = documentos.findIndex(
        (documento) => documento.id === id
    );

    if (indice >= 0) {
        documentos.splice(indice, 1);
    }
}

function obtenerExtension(nombre) {
    const partes = nombre.toLowerCase().split(".");
    return partes.length > 1 ? partes.pop() : "";
}

function crearId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
