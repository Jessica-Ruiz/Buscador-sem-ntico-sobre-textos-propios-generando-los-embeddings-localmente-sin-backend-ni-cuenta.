import {
    cargarConfiguracion
} from "./almacenamiento.mjs";

const estadoModelo = document.querySelector("#estadoModelo");
const listaDocumentos = document.querySelector("#listaDocumentos");
const estadoVacio = document.querySelector("#estadoVacio");
const contadorDocumentos = document.querySelector("#contadorDocumentos");
const contadorFragmentos = document.querySelector("#contadorFragmentos");
const contadorPaginas = document.querySelector("#contadorPaginas");
const estadoResultados = document.querySelector("#estadoResultados");
const listaResultados = document.querySelector("#listaResultados");
const contadorResultados = document.querySelector("#contadorResultados");
const valorUmbral = document.querySelector("#valorUmbral");
const umbral = document.querySelector("#umbral");
const cantidadResultados = document.querySelector("#cantidadResultados");

export function inicializarInterfaz(configuracion = null) {
    const config = configuracion ?? cargarConfiguracion();

    if (config) {
        cantidadResultados.value = String(
            config.cantidadResultados ?? 5
        );

        umbral.value = String(
            config.umbral ?? 0.3
        );
    }

    valorUmbral.value = Number(umbral.value).toFixed(2);
}

export function establecerEstadoModelo(mensaje, tipo = "warning") {
    estadoModelo.textContent = mensaje;
    estadoModelo.className = `status status-${tipo}`;
}

export function mostrarEstado(mensaje, tipo = "warning") {
    establecerEstadoModelo(mensaje, tipo);
}

export function mostrarDocumentos(documentos) {
    listaDocumentos.replaceChildren();

    if (documentos.length === 0) {
        listaDocumentos.appendChild(estadoVacio);
        return;
    }

    for (const documento of documentos) {
        const item = document.createElement("article");
        item.className = "document-item";

        const icono = document.createElement("div");
        icono.className = "document-icon";
        icono.textContent = documento.extension.toUpperCase();

        const info = document.createElement("div");

        const nombre = document.createElement("div");
        nombre.className = "document-name";
        nombre.textContent = documento.nombre;

        const meta = document.createElement("div");
        meta.className = "document-meta";
        meta.textContent =
            `${documento.fragmentos.length} fragmentos` +
            (documento.paginas > 0
                ? ` · ${documento.paginas} páginas`
                : "");

        info.append(nombre, meta);

        const acciones = document.createElement("div");

        const estado = document.createElement("span");
        estado.className = "document-state";
        estado.textContent = "✓ Embeddings listos";

        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "button";
        boton.textContent = "Eliminar";
        boton.dataset.eliminarDocumento = documento.id;
        boton.setAttribute(
            "aria-label",
            `Eliminar ${documento.nombre}`
        );

        acciones.append(estado, boton);
        item.append(icono, info, acciones);
        listaDocumentos.appendChild(item);
    }
}

export function actualizarEstadisticas(documentos) {
    const fragmentos = documentos.reduce(
        (total, documento) => total + documento.fragmentos.length,
        0
    );

    const paginas = documentos.reduce(
        (total, documento) => total + documento.paginas,
        0
    );

    contadorDocumentos.textContent = String(documentos.length);
    contadorFragmentos.textContent = String(fragmentos);
    contadorPaginas.textContent = String(paginas);
}

export function mostrarResultados(resultados) {
    listaResultados.replaceChildren();
    estadoResultados.classList.add("hidden");

    for (let indice = 0; indice < resultados.length; indice += 1) {
        const resultado = resultados[indice];

        const tarjeta = document.createElement("article");
        tarjeta.className = "result-card";

        const cabecera = document.createElement("div");
        cabecera.className = "result-top";

        const ranking = document.createElement("span");
        ranking.className = "result-rank";
        ranking.textContent = `#${indice + 1}`;

        const puntuacion = document.createElement("span");
        puntuacion.className = "result-score";
        puntuacion.textContent =
            `${(resultado.score * 100).toFixed(1)}%`;

        const texto = document.createElement("p");
        texto.className = "result-text";
        texto.textContent = resultado.texto;

        const fuente = document.createElement("div");
        fuente.className = "result-source";
        fuente.textContent =
            `Documento: ${resultado.documento} · Fragmento: ${resultado.fragmento + 1}`;

        cabecera.append(ranking, puntuacion);
        tarjeta.append(cabecera, texto, fuente);

        listaResultados.appendChild(tarjeta);
    }

    contadorResultados.textContent =
        `${resultados.length} resultado${resultados.length === 1 ? "" : "s"}`;
}

export function mostrarSinResultados() {
    listaResultados.replaceChildren();
    estadoResultados.classList.remove("hidden");

    const titulo = estadoResultados.querySelector("h3");
    const descripcion = estadoResultados.querySelector("p");

    titulo.textContent = "No se encontraron resultados";
    descripcion.textContent =
        "Prueba otra consulta o reduce el umbral de similitud.";

    contadorResultados.textContent = "0 resultados";
}

export function limpiarResultados() {
    listaResultados.replaceChildren();
    estadoResultados.classList.remove("hidden");

    const titulo = estadoResultados.querySelector("h3");
    const descripcion = estadoResultados.querySelector("p");

    titulo.textContent = "Realiza una búsqueda";
    descripcion.textContent =
        "Los resultados relevantes aparecerán aquí.";

    contadorResultados.textContent = "0 resultados";
}
