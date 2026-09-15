
/**
 * Motor de embeddings local.
 *
 * La inferencia se ejecuta dentro del navegador mediante Transformers.js.
 * No se utiliza un backend de IA ni una API de embeddings.
 *
 * Modelo:
 * Xenova/paraphrase-multilingual-MiniLM-L12-v2
 */

const TRANSFORMERS_URL =
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

const MODEL_ID =
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

const PDFJS_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const PDFJS_WORKER_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";

let extractor = null;
let cargaModelo = null;
let pdfjs = null;

/**
 * Carga el modelo una sola vez.
 */
export async function cargarModelo(onProgress = null) {
    if (extractor) {
        return extractor;
    }

    if (cargaModelo) {
        return cargaModelo;
    }

    cargaModelo = (async () => {
        try {
            const { pipeline, env } =await import(TRANSFORMERS_URL);

            env.useBrowserCache = true;
            env.allowRemoteModels = true;

            extractor = await pipeline(
                "feature-extraction",
                MODEL_ID,
                {
                    progress_callback: (evento) => {
                        if (
                            typeof onProgress === "function"
                        ) {
                            onProgress(evento);
                        }
                    }
                }
            );

            return extractor;

        } catch (error) {
            console.error(
                "ERROR REAL AL CARGAR EL MODELO:",
                error
            );

            extractor = null;

            throw error;
        }
    })();

    try {
        return await cargaModelo;

    } catch (error) {
        cargaModelo = null;
        throw error;
    }
}

/**
 * Indica si el modelo ya está cargado.
 */
export function modeloEstaCargado() {
    return extractor !== null;
}

/**
 * Genera un embedding para un texto.
 */
export async function generarEmbedding(texto) {
    if (
        typeof texto !== "string" ||
        texto.trim().length === 0
    ) {
        throw new Error(
            "El texto está vacío."
        );
    }

    const modelo =
        await cargarModelo();

    try {
        const salida = await modelo(
            texto,
            {
                pooling: "mean",
                normalize: true
            }
        );

        if (
            !salida ||
            !salida.data
        ) {
            throw new Error(
                "El modelo no devolvió un vector de embedding."
            );
        }

        return Array.from(
            salida.data
        );

    } catch (error) {
        console.error(
            "ERROR REAL GENERANDO EMBEDDING:",
            error
        );

        throw error;
    }
}

/**
 * Genera embeddings para varios textos.
 *
 * Se procesan individualmente para mejorar
 * la compatibilidad y estabilidad en el navegador.
 */
export async function generarEmbeddings(
    textos,
    onProgress = null
) {
    if (
        !Array.isArray(textos) ||
        textos.length === 0
    ) {
        return [];
    }

    const textosValidos =
        textos.filter(
            (texto) =>
                typeof texto === "string" &&
                texto.trim().length > 0
        );

    if (
        textosValidos.length === 0
    ) {
        throw new Error(
            "No hay textos válidos para generar embeddings."
        );
    }

    const modelo =
        await cargarModelo(onProgress);

    const vectores = [];

    for (
        let i = 0;
        i < textosValidos.length;
        i++
    ) {
        const texto =
            textosValidos[i];

        try {
            const salida =
                await modelo(
                    texto,
                    {
                        pooling: "mean",
                        normalize: true
                    }
                );

            if (
                !salida ||
                !salida.data
            ) {
                throw new Error(
                    "El modelo no devolvió datos para este texto."
                );
            }

            const vector =
                Array.from(
                    salida.data
                );

            vectores.push(vector);

            if (
                typeof onProgress === "function"
            ) {
                onProgress({
                    status: "embedding",
                    progress:
                        (i + 1) /
                        textosValidos.length,
                    loaded: i + 1,
                    total:
                        textosValidos.length
                });
            }

        } catch (error) {
            console.error(
                `ERROR EN EMBEDDING ${i + 1}:`,
                error
            );

            throw new Error(
                `Error generando el embedding ${i + 1} de ${textosValidos.length}: ` +
                obtenerMensajeError(error)
            );
        }
    }

    return vectores;
}

/**
 * Extrae texto de un PDF con PDF.js.
 */
export async function extraerTextoPDF(file) {
    if (!file) {
        throw new Error(
            "No se recibió ningún archivo PDF."
        );
    }

    try {
        const pdfjs =
            await importarPDFJS();

        const buffer =
            await file.arrayBuffer();

        if (
            !buffer ||
            buffer.byteLength === 0
        ) {
            throw new Error(
                "El archivo PDF está vacío."
            );
        }

        const pdf =
            await pdfjs
                .getDocument({
                    data: buffer
                })
                .promise;

        const paginasTexto = [];

        for (
            let numeroPagina = 1;
            numeroPagina <= pdf.numPages;
            numeroPagina++
        ) {
            const pagina =
                await pdf.getPage(
                    numeroPagina
                );

            const contenido =
                await pagina.getTextContent();

            const textoPagina =
                contenido.items
                    .map(
                        (item) =>
                            item.str || ""
                    )
                    .join(" ")
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

            if (
                textoPagina.length > 0
            ) {
                paginasTexto.push(
                    `Página ${numeroPagina}\n${textoPagina}`
                );
            }
        }

        const textoFinal =
            paginasTexto.join(
                "\n\n"
            );

        if (
            textoFinal.trim().length === 0
        ) {
            throw new Error(
                "El PDF no contiene texto extraíble. " +
                "Puede ser un documento escaneado."
            );
        }

        return {
            texto: textoFinal,
            paginas: pdf.numPages
        };

    } catch (error) {
        console.error(
            "ERROR REAL PROCESANDO PDF:",
            error
        );

        throw error;
    }
}

/**
 * Importa PDF.js y configura su Worker.
 */
async function importarPDFJS() {
    if (pdfjs) {
        return pdfjs;
    }

    try {
        pdfjs =
            await import(
                PDFJS_URL
            );

        pdfjs
            .GlobalWorkerOptions
            .workerSrc =
                PDFJS_WORKER_URL;

        return pdfjs;

    } catch (error) {
        console.error(
            "ERROR CARGANDO PDF.JS:",
            error
        );

        pdfjs = null;

        throw error;
    }
}

/**
 * Obtiene el mensaje real del error.
 */
function obtenerMensajeError(error) {
    if (!error) {
        return "Error desconocido.";
    }

    if (
        typeof error === "string"
    ) {
        return error;
    }

    if (
        error.message
    ) {
        return String(
            error.message
        );
    }

    if (
        error.reason
    ) {
        return String(
            error.reason
        );
    }

    if (
        error.name
    ) {
        return String(
            error.name
        );
    }

    try {
        return JSON.stringify(
            error
        );
    } catch {
        return "Error desconocido.";
    }
}

/**
 * Devuelve el nombre del modelo utilizado.
 */
export function obtenerNombreModelo() {
    return MODEL_ID;
}

