
// CONFIGURACIÓN


const TRANSFORMERS_URL =
    "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2";

const MODEL_ID ="Xenova/paraphrase-multilingual-MiniLM-L12-v2";

const PDFJS_VERSION = "4.10.38";

const PDFJS_URL =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;

const PDFJS_WORKER_URL =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

const MAMMOTH_URL =
    "https://cdn.jsdelivr.net/npm/mammoth@1.8.0/+esm";



// VARIABLES


let extractor = null;

let cargaModelo = null;

let pdfjs = null;

let mammoth = null;



// CARGAR MODELO DE EMBEDDINGS


export async function cargarModelo(onProgress = null) {

    if (extractor) {
        return extractor;
    }

    if (cargaModelo) {
        return cargaModelo;
    }

    cargaModelo = (async () => {

        const {
            pipeline,
            env
        } = await import(TRANSFORMERS_URL);

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

    })();

    try {

        return await cargaModelo;

    } catch (error) {

        extractor = null;
        cargaModelo = null;

        throw error;
    }
}


// ESTADO DEL MODELO


export function modeloEstaCargado() {

    return extractor !== null;

}



// GENERAR UN EMBEDDING


export async function generarEmbedding(texto) {

    if (
        typeof texto !== "string" ||
        texto.trim().length === 0
    ) {

        throw new Error(
            "No se puede generar un embedding de un texto vacío."
        );

    }

    const modelo =
        await cargarModelo();

    const salida =
        await modelo(
            texto,
            {
                pooling: "mean",
                normalize: true
            }
        );

    return Array.from(salida.data);

}



// GENERAR VARIOS EMBEDDINGS


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
        textos.map(
            texto => String(texto ?? "")
        );

    const modelo =
        await cargarModelo(onProgress);

    const salida =
        await modelo(
            textosValidos,
            {
                pooling: "mean",
                normalize: true
            }
        );

    const vectores =
        salida.tolist();

    if (
        typeof onProgress === "function"
    ) {

        onProgress({

            status: "embedding",

            progress: 1,

            loaded: textosValidos.length,

            total: textosValidos.length

        });

    }

    return vectores;

}



// PDF.JS


async function importarPDFJS() {

    if (pdfjs) {
        return pdfjs;
    }

    pdfjs =
        await import(PDFJS_URL);

    pdfjs.GlobalWorkerOptions.workerSrc =
        PDFJS_WORKER_URL;

    return pdfjs;
}



// EXTRAER TEXTO DE Pdf

export async function extraerTextoPDF(file) {

    if (!file) {

        throw new Error(
            "No se recibió ningún archivo PDF."
        );

    }

    const esPDF =
        file.type === "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf");

    if (!esPDF) {

        throw new Error(
            "El archivo seleccionado no es un PDF."
        );

    }

    const pdfjs =
        await importarPDFJS();

    const buffer =
        await file.arrayBuffer();

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
            await pdf.getPage(numeroPagina);

        const contenido =
            await pagina.getTextContent();

        const textoPagina =
            contenido.items
                .map(
                    item => item.str || ""
                )
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();

        if (textoPagina.length > 0) {

            paginasTexto.push(
                `Página ${numeroPagina}\n${textoPagina}`
            );

        }

    }

    return {

        texto:
            paginasTexto.join("\n\n"),

        paginas:
            pdf.numPages

    };

}



// MAMMOTH.JS


async function importarMammoth() {

    if (mammoth) {
        return mammoth;
    }

    mammoth =
        await import(MAMMOTH_URL);

    return mammoth;
}



// EXTRAER TEXTO DE DOCX


export async function extraerTextoDOCX(file) {

    if (!file) {

        throw new Error(
            "No se recibió ningún documento DOCX."
        );

    }

    const nombre =
        file.name.toLowerCase();

    if (!nombre.endsWith(".docx")) {

        throw new Error(
            "El archivo no es un documento DOCX válido."
        );

    }

    const modulo =
        await importarMammoth();

    const buffer =
        await file.arrayBuffer();

    const resultado =
        await modulo.extractRawText({
            arrayBuffer: buffer
        });

    const texto =
        String(resultado.value || "")
            .replace(/\r\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();

    return {

        texto,

        paginas: null

    };

}



// EXTRAER TEXTO TXT


export async function extraerTextoTXT(file) {

    const texto =
        await file.text();

    return {

        texto:
            texto.trim(),

        paginas: null

    };

}



// EXTRAER TEXTO MARKDOWN


export async function extraerTextoMD(file) {

    const texto =
        await file.text();

    return {

        texto:
            texto.trim(),

        paginas: null

    };

}



// EXTRAER TEXTO CSV


export async function extraerTextoCSV(file) {

    const texto =
        await file.text();

    return {

        texto:
            texto.trim(),

        paginas: null

    };

}



// EXTRAER TEXTO JSON


export async function extraerTextoJSON(file) {

    const contenido =
        await file.text();

    let texto;

    try {

        const datos =
            JSON.parse(contenido);

        texto =
            JSON.stringify(
                datos,
                null,
                2
            );

    } catch {

        texto =
            contenido;

    }

    return {

        texto:
            texto.trim(),

        paginas: null

    };

}



// DETECTAR FORMATO Y EXTRAER TEXTO


export async function extraerTextoArchivo(file) {

    if (!file) {

        throw new Error(
            "No se recibió ningún archivo."
        );

    }

    const nombre =
        file.name.toLowerCase();

    
    // PDF
    

    if (
        nombre.endsWith(".pdf")
    ) {

        return await extraerTextoPDF(file);

    }


    
    // DOCX
    

    if (
        nombre.endsWith(".docx")
    ) {

        return await extraerTextoDOCX(file);

    }


    
    // TXT
    

    if (
        nombre.endsWith(".txt")
    ) {

        return await extraerTextoTXT(file);

    }


    
    // MARKDOWN
    

    if (
        nombre.endsWith(".md") ||
        nombre.endsWith(".markdown")
    ) {

        return await extraerTextoMD(file);

    }



    // CSV


    if (
        nombre.endsWith(".csv")
    ) {

        return await extraerTextoCSV(file);

    }



    // JSON


    if (
        nombre.endsWith(".json")
    ) {

        return await extraerTextoJSON(file);

    }



    // FORMATO NO SOPORTADO


    throw new Error(
        `Formato no soportado: ${file.name}`
    );

}



// OBTENER EXTENSIÓN


export function obtenerExtensionArchivo(file) {

    if (!file || !file.name) {
        return "";
    }

    const partes =
        file.name
            .toLowerCase()
            .split(".");

    return partes.length > 1
        ? partes.pop()
        : "";

}



// VERIFICAR FORMATO SOPORTADO


export function formatoSoportado(file) {

    const extensiones = [

        "txt",
        "md",
        "markdown",
        "csv",
        "json",
        "pdf",
        "docx"

    ];

    const extension =
        obtenerExtensionArchivo(file);

    return extensiones.includes(
        extension
    );

}



// LISTA DE FORMATOS


export function obtenerFormatosSoportados() {

    return [

        ".txt",
        ".md",
        ".markdown",
        ".csv",
        ".json",
        ".pdf",
        ".docx"

    ];

}



// NOMBRE DEL MODELO


export function obtenerNombreModelo() {

    return MODEL_ID;

}