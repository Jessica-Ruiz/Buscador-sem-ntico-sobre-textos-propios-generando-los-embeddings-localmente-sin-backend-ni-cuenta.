
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = process.env.PORT || 3000;

// Obtener la ruta de la carpeta del proyecto.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar lectura de solicitudes JSON.
app.use(express.json({ limit: "1mb" }));

// Publicar únicamente los recursos necesarios del frontend.
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));

// Ruta principal.
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Consultar el estado del servidor.
app.get("/api/estado", (req, res) => {
    res.status(200).json({
        estado: "correcto",
        mensaje: "Servidor del buscador semántico funcionando",
        proyecto: "SemanticSearch Local"
    });
});

// Ruta de prueba para recibir consultas.

app.post("/api/consulta", (req, res) => {
    const { consulta } = req.body ?? {};

    // Verificar que la consulta sea un texto.
    if (typeof consulta !== "string") {
        return res.status(400).json({
            error: "La consulta debe ser un texto."
        });
    }

    const consultaLimpia = consulta.trim();

    // Evitar consultas vacías.
    if (consultaLimpia.length === 0) {
        return res.status(400).json({
            error: "La consulta no puede estar vacía."
        });
    }

    // Limitar la longitud de la consulta.
    if (consultaLimpia.length > 500) {
        return res.status(400).json({
            error: "La consulta no puede superar los 500 caracteres."
        });
    }

    res.status(200).json({
        mensaje: "Consulta recibida correctamente",
        consulta: consultaLimpia
    });
});


// Ruta para recursos inexistentes.
app.use((req, res) => {
    res.status(404).json({
        error: "Recurso no encontrado"
    });
});

// Iniciar servidor.
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});
