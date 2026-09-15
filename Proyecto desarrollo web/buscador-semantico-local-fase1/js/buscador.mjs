/**
 * Motor de búsqueda semántica.
 */

import { generarEmbedding } from "./embeddings.mjs";

/**
 * Calcula la similitud coseno.
 *
 * Como los embeddings se generan normalizados, también puede interpretarse
 * como producto punto, pero mantenemos la fórmula explícita para fines
 * académicos y de explicación.
 */
export function similitudCoseno(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
        throw new Error("Los vectores deben tener la misma dimensión.");
    }

    let producto = 0;
    let normaA = 0;
    let normaB = 0;

    for (let indice = 0; indice < a.length; indice += 1) {
        producto += a[indice] * b[indice];
        normaA += a[indice] ** 2;
        normaB += b[indice] ** 2;
    }

    if (normaA === 0 || normaB === 0) {
        return 0;
    }

    return producto / (
        Math.sqrt(normaA) * Math.sqrt(normaB)
    );
}

/**
 * Busca los fragmentos semánticamente más cercanos a una consulta.
 */
export async function buscarSemantico(
    consulta,
    documentos,
    cantidad = 5,
    umbral = 0.3
) {
    const consultaLimpia = consulta.trim();

    if (!consultaLimpia) {
        return [];
    }

    const embeddingConsulta = await generarEmbedding(
        consultaLimpia
    );

    const resultados = [];

    for (const documento of documentos) {
        for (const fragmento of documento.fragmentos) {
            if (!fragmento.embedding) {
                continue;
            }

            const score = similitudCoseno(
                embeddingConsulta,
                fragmento.embedding
            );

            if (score >= umbral) {
                resultados.push({
                    score,
                    texto: fragmento.texto,
                    documento: documento.nombre,
                    fragmento: fragmento.indice
                });
            }
        }
    }

    return resultados
        .sort((a, b) => b.score - a.score)
        .slice(0, cantidad);
}

export function ordenarResultados(resultados) {
    return [...resultados].sort(
        (a, b) => b.score - a.score
    );
}

export function filtrarPorUmbral(resultados, umbral = 0.3) {
    return resultados.filter(
        (resultado) => resultado.score >= umbral
    );
}
