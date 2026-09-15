// Importa las funciones relacionadas con el procesamiento de texto
// y la generación de embeddings desde embeddings.mjs.
//
// extraerTextoPDF()
//    → extrae el texto y la cantidad de páginas de un PDF.
//
// generarEmbeddings()
//    → convierte varios fragmentos de texto en vectores numéricos.
import {
    extraerTextoPDF,
    generarEmbeddings
} from "./embeddings.mjs";


/**
 * Almacén temporal de los documentos cargados.
 *
 * Es un arreglo que permanece en memoria mientras la aplicación
 * está ejecutándose.
 *
 * Aquí se almacenan los documentos procesados junto con:
 * - nombre
 * - extensión
 * - tamaño
 * - contenido
 * - páginas
 * - fragmentos
 * - embeddings
 *
 * No se utiliza localStorage para guardar los documentos.
 */
const documentos = [];


/**
 * Procesa una lista de archivos y genera sus embeddings.
 *
 * @param {FileList|Array} archivos
 * Archivos seleccionados por el usuario.
 *
 * @param {Object} opciones
 * Opciones adicionales para el procesamiento.
 *
 * @returns {Array}
 * Lista de documentos procesados.
 */
export async function procesarArchivos(
    archivos,
    opciones = {}
) {

    // Recorre todos los archivos recibidos.
    for (const archivo of archivos) {

        // Procesa individualmente cada archivo.
        //
        // await espera a que termine la extracción,
        // división de fragmentos y generación de embeddings.
        const documento = await procesarArchivo(
            archivo,
            opciones
        );


        // Busca si ya existe un documento con el mismo nombre.
        //
        // find() devuelve el primer elemento que cumpla
        // la condición indicada.
        const existente = documentos.find(
            (item) => item.nombre === documento.nombre
        );


        // Si ya existe un documento con ese nombre...
        if (existente) {

            // Obtiene la posición que ocupa dentro del arreglo.
            const indice = documentos.indexOf(existente);


            // Reemplaza el documento anterior por el nuevo.
            //
            // Esto evita tener dos documentos con el mismo nombre.
            documentos[indice] = documento;

        } else {

            // Si no existe, agrega el nuevo documento
            // al almacén temporal.
            documentos.push(documento);
        }
    }


    // Devuelve todos los documentos actualmente procesados.
    return documentos;
}


/**
 * Procesa un único archivo.
 *
 * Este proceso incluye:
 *
 * 1. Obtener la extensión.
 * 2. Extraer el contenido.
 * 3. Dividir el contenido en fragmentos.
 * 4. Crear los objetos de fragmentos.
 * 5. Generar embeddings.
 * 6. Asociar cada embedding con su fragmento.
 * 7. Construir el objeto final del documento.
 *
 * @param {File} file
 * Archivo seleccionado.
 *
 * @param {Object} opciones
 * Opciones del procesamiento.
 *
 * @returns {Object}
 * Documento procesado.
 */
async function procesarArchivo(
    file,
    opciones = {}
) {

    // Obtiene la extensión del archivo.
    //
    // Ejemplo:
    // documento.pdf → "pdf"
    // datos.csv → "csv"
    const extension = obtenerExtension(file.name);


    // Variable donde se almacenará el texto extraído.
    let contenido = "";


    // Variable para almacenar el número de páginas.
    //
    // Para archivos que no son PDF permanecerá en 0.
    let paginas = 0;


    // Determina cómo se debe procesar el archivo
    // dependiendo de su extensión.
    switch (extension) {


        // Los archivos de texto, Markdown, CSV y JSON
        // pueden leerse directamente como texto.
        case "txt":
        case "md":
        case "csv":
        case "json":

            // file.text() lee el contenido del archivo
            // y devuelve una promesa con el texto.
            contenido = await file.text();

            break;


        // Procesamiento específico para archivos PDF.
        case "pdf": {

            // Envía el archivo a la función encargada
            // de extraer su contenido.
            const resultado = await extraerTextoPDF(file);


            // Obtiene el texto extraído del PDF.
            contenido = resultado.texto;


            // Obtiene la cantidad de páginas procesadas.
            paginas = resultado.paginas;

            break;
        }


        // Si la extensión no pertenece a ninguno
        // de los formatos soportados...
        default:

            // Se genera un error indicando el formato
            // que no está permitido.
            throw new Error(
                `Formato no soportado: .${extension}`
            );
    }


    // Comprueba que realmente se haya obtenido contenido.
    //
    // trim() elimina espacios al principio y al final.
    //
    // Si después de eliminar los espacios no queda texto,
    // significa que el archivo no contiene información
    // que pueda ser procesada.
    if (contenido.trim().length === 0) {

        // Detiene el procesamiento mostrando un error.
        throw new Error(
            `${file.name} no contiene texto extraíble.`
        );
    }


    // Divide el contenido completo en fragmentos más pequeños.
    //
    // Los embeddings se generan sobre estos fragmentos
    // en lugar de utilizar todo el documento como un único bloque.
    const fragmentosTexto =
        dividirEnFragmentos(contenido);


    // Convierte cada fragmento de texto en un objeto.
    const fragmentos = fragmentosTexto.map(
        (texto, indice) => ({

            // Genera un identificador único para el fragmento.
            //
            // Se combina un ID general con el índice
            // del fragmento.
            id: `${crearId()}-${indice}`,

            // Guarda el nombre del documento al que pertenece.
            documento: file.name,

            // Guarda el texto del fragmento.
            texto,

            // Guarda la posición del fragmento.
            indice,

            // Inicialmente el embedding está vacío.
            //
            // Posteriormente se reemplazará por el vector
            // generado por el modelo.
            embedding: null
        })
    );


    // Genera los embeddings de todos los fragmentos.
    //
    // Primero se utiliza map() para obtener únicamente
    // los textos.
    //
    // onEmbeddingProgress permite enviar información
    // sobre el progreso del proceso a la interfaz.
    const embeddings = await generarEmbeddings(
        fragmentos.map(
            (fragmento) => fragmento.texto
        ),
        opciones.onEmbeddingProgress
    );


    // Recorre todos los fragmentos.
    for (
        let indice = 0;
        indice < fragmentos.length;
        indice += 1
    ) {

        // Asocia cada embedding con su fragmento correspondiente.
        //
        // embeddings[0] → fragmentos[0]
        // embeddings[1] → fragmentos[1]
        // etc.
        fragmentos[indice].embedding =
            embeddings[indice];
    }


    // Construye y devuelve el documento completamente procesado.
    return {

        // ID único del documento.
        id: crearId(),

        // Nombre original del archivo.
        nombre: file.name,

        // Extensión del archivo.
        extension,

        // Tamaño del archivo en bytes.
        tamanio: file.size,

        // Contenido completo del archivo.
        contenido,

        // Cantidad de páginas.
        paginas,

        // Lista de fragmentos con sus embeddings.
        fragmentos
    };
}


/**
 * Divide un texto grande en fragmentos más pequeños.
 *
 * Primero intenta separar el contenido por párrafos.
 *
 * Si un párrafo tiene 900 caracteres o menos,
 * se conserva completo.
 *
 * Si supera los 900 caracteres,
 * se divide en bloques.
 *
 * Esto permite trabajar con textos más manejables
 * para el modelo de embeddings.
 */
export function dividirEnFragmentos(texto) {

    // Normaliza los saltos de línea.
    //
    // Windows suele utilizar:
    // \r\n
    //
    // Aquí se convierte a:
    // \n
    //
    // Después divide el texto cuando encuentra
    // uno o más saltos de línea entre párrafos.
    const parrafos = texto
        .replace(/\r\n/g, "\n")
        .split(/\n\s*\n/)

        // Elimina espacios innecesarios de cada párrafo.
        .map((parrafo) => parrafo.trim())

        // Elimina párrafos completamente vacíos.
        .filter(
            (parrafo) => parrafo.length > 0
        );


    // Arreglo donde se almacenarán
    // los fragmentos finales.
    const resultado = [];


    // Recorre todos los párrafos encontrados.
    for (const parrafo of parrafos) {


        // Si el párrafo tiene 900 caracteres o menos,
        // se agrega directamente.
        if (parrafo.length <= 900) {

            resultado.push(parrafo);

            // Continúa con el siguiente párrafo.
            continue;
        }


        // Si el párrafo es demasiado largo,
        // se divide en bloques.
        //
        // inicio aumenta de 750 en 750.
        //
        // Cada bloque puede tener hasta 900 caracteres.
        for (
            let inicio = 0;
            inicio < parrafo.length;
            inicio += 750
        ) {

            // Extrae un bloque de texto.
            //
            // slice() comienza en "inicio"
            // y termina como máximo 900 caracteres después.
            const bloque = parrafo
                .slice(inicio, inicio + 900)
                .trim();


            // Comprueba que el bloque no esté vacío.
            if (bloque.length > 0) {

                // Agrega el bloque a la lista de resultados.
                resultado.push(bloque);
            }
        }
    }


    // Si se encontraron fragmentos, devuelve esos fragmentos.
    //
    // Si por alguna razón no se generó ninguno,
    // utiliza todo el texto como un único fragmento.
    return resultado.length > 0
        ? resultado
        : [texto.trim()];
}


/**
 * Devuelve una copia de la lista de documentos.
 *
 * Se utiliza [...documentos] para evitar entregar
 * directamente el arreglo interno.
 *
 * De esta manera, otras partes del programa pueden consultar
 * los documentos sin modificar directamente el almacén interno.
 */
export function obtenerDocumentos() {

    return [...documentos];
}


/**
 * Elimina un documento utilizando su identificador.
 *
 * @param {string} id
 * Identificador del documento que se desea eliminar.
 */
export function eliminarDocumento(id) {

    // Busca la posición del documento cuyo ID coincida.
    const indice = documentos.findIndex(
        (documento) => documento.id === id
    );


    // Si se encontró el documento...
    if (indice >= 0) {

        // splice() elimina el documento del arreglo.
        documentos.splice(indice, 1);
    }
}


/**
 * Obtiene la extensión de un archivo.
 *
 * @param {string} nombre
 * Nombre completo del archivo.
 *
 * @returns {string}
 * Extensión del archivo.
 *
 * Ejemplo:
 *
 * "informe.pdf" → "pdf"
 * "datos.csv" → "csv"
 */
function obtenerExtension(nombre) {

    // Convierte el nombre a minúsculas y lo divide
    // utilizando el punto como separador.
    //
    // "informe.pdf"
    // →
    // ["informe", "pdf"]
    const partes = nombre
        .toLowerCase()
        .split(".");


    // Si existe más de una parte,
    // obtiene la última como extensión.
    //
    // Si no existe extensión,
    // devuelve una cadena vacía.
    return partes.length > 1
        ? partes.pop()
        : "";
}


/**
 * Genera un identificador único.
 *
 * Combina:
 * - Date.now() → tiempo actual en milisegundos.
 * - Math.random() → número aleatorio.
 *
 * Esto permite crear identificadores diferentes
 * para documentos y fragmentos.
 */
function crearId() {

    return `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}