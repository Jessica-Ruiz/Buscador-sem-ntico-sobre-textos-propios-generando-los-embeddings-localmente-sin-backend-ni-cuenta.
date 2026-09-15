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
        const documento = await procesarArchivo(
            archivo,
            opciones
        );

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

async function procesarArchivo(file, opciones = {}) {
    const extension = obtenerExtension(file.name);

    let contenido = "";
    let paginas = 0;

    switch (extension) {
        case "txt":
        case "md":
        case "csv":
        case "json":
            contenido = await file.text();
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

    if (contenido.trim().length === 0) {
        throw new Error(`${file.name} no contiene texto extraíble.`);
    }

    const fragmentosTexto = dividirEnFragmentos(contenido);

    const fragmentos = fragmentosTexto.map((texto, indice) => ({
        id: `${crearId()}-${indice}`,
        documento: file.name,
        texto,
        indice,
        embedding: null
    }));

    const embeddings = await generarEmbeddings(
        fragmentos.map((fragmento) => fragmento.texto),
        opciones.onEmbeddingProgress
    );

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
