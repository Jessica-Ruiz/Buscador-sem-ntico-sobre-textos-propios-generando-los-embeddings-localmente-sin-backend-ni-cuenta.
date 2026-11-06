
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const modelo = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

const base = `https://huggingface.co/${modelo}/resolve/main`;

const destino = path.join(
    process.cwd(),
    "models",
    modelo
);

const archivos = [
    "config.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "special_tokens_map.json",
    "onnx/model_quantized.onnx"
];

for (const archivo of archivos) {
    const ruta = path.join(destino, archivo);

    if (fs.existsSync(ruta)) {
        console.log(`Ya existe: ${archivo}`);
        continue;
    }

    fs.mkdirSync(path.dirname(ruta), {
        recursive: true
    });

    console.log(`Descargando: ${archivo}`);

    const respuesta = await fetch(`${base}/${archivo}`);

    if (!respuesta.ok || !respuesta.body) {
        throw new Error(
            `Error descargando ${archivo}: HTTP ${respuesta.status}`
        );
    }

    const temporal = `${ruta}.tmp`;

    try {
        await pipeline(
            Readable.fromWeb(respuesta.body),
            fs.createWriteStream(temporal)
        );

        fs.renameSync(temporal, ruta);
        console.log(`Descargado correctamente: ${archivo}`);
    } catch (error) {
        fs.rmSync(temporal, { force: true });
        throw error;
    }
}

console.log("Archivos del modelo preparados.");
