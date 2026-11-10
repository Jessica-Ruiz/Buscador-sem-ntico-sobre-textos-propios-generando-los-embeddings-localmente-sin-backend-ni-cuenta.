
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";

const app = express();
const PORT = process.env.PORT || 3000;

// Evitar revelar la tecnología del servidor.
app.disable("x-powered-by");

// Reconocer HTTPS cuando la aplicación está detrás
// del proxy de Render.
if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
}

// Configurar encabezados de seguridad HTTP.
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");

    // Activar HSTS únicamente en producción HTTPS.
    // Periodo inicial de prueba: 5 minutos.
    if (
        process.env.NODE_ENV === "production" &&
        req.secure
    ) {
        res.setHeader(
            "Strict-Transport-Security",
            "max-age=300"
        );
    }

    // Aplicar la política de seguridad CSP.
    res.setHeader(
        "Content-Security-Policy",
        [
            "default-src 'self'",
            "script-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com 'wasm-unsafe-eval'",
            "style-src 'self' https://cdn.jsdelivr.net",
            "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
            "worker-src 'self' blob:",
            "img-src 'self' data: blob:",
            "font-src 'self' data:",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'"
        ].join("; ")
    );

    next();
});

// Habilitar compresión de respuestas.
app.use(compression());

// Obtener la ruta de la carpeta del proyecto.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar lectura de solicitudes JSON.
app.use(express.json({ limit: "1mb" }));

// Publicar únicamente los recursos necesarios del frontend.
app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/models", express.static(path.join(__dirname, "models")));

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

    return res.status(200).json({
        mensaje: "Consulta recibida correctamente",
        consulta: consultaLimpia
    });
});

// Responder con JSON cuando una ruta de API no existe.
app.use("/api", (req, res) => {
    return res.status(404).json({
        error: "La ruta de API solicitada no existe."
    });
});

// Manejo centralizado de errores.
app.use((err, req, res, next) => {

    // JSON malformado.
    if (
        err instanceof SyntaxError &&
        err.status === 400 &&
        "body" in err
    ) {
        return res.status(400).json({
            error: "El formato JSON enviado no es válido."
        });
    }

    // Solicitudes demasiado grandes.
    if (err.status === 413) {
        return res.status(413).json({
            error: "La solicitud supera el tamaño permitido."
        });
    }

    // Otros errores del servidor.
    console.error("Error interno:", err);

    return res.status(500).json({
        error: "Ocurrió un error interno en el servidor."
    });
});

// Iniciar servidor.

 // Iniciar servidor.
app.listen(PORT, () => {
    const URL = `http://localhost:${PORT}`;

    console.log("       SEMANTICSEARCH LOCAL");
    console.log("Servidor iniciado correctamente");
    console.log(`Puerto: ${PORT}`);
    console.log(`Acceso local: ${URL}`);

});

