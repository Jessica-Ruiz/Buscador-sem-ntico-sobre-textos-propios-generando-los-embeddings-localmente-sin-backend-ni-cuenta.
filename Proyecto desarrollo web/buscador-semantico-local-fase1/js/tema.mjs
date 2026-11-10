
const CLAVE_TEMA = "semanticSearchLocal.theme";

const temasValidos = ["light", "dark", "system"];

const sistema = window.matchMedia("(prefers-color-scheme: dark)");

function obtenerTemaGuardado() {
    try {
        const tema = localStorage.getItem(CLAVE_TEMA);
        return temasValidos.includes(tema) ? tema : "system";
    } catch {
        return "system";
    }
}

let temaSeleccionado = obtenerTemaGuardado();

function aplicarTema() {
    const temaFinal =
        temaSeleccionado === "system"
            ? (sistema.matches ? "dark" : "light")
            : temaSeleccionado;

    document.documentElement.setAttribute("data-bs-theme", temaFinal);
}

aplicarTema();

document.addEventListener("DOMContentLoaded", () => {
    const selector = document.getElementById("selectorTema");

    if (!selector) return;

    selector.value = temaSeleccionado;

    selector.addEventListener("change", () => {
        temaSeleccionado = selector.value;

        if (!temasValidos.includes(temaSeleccionado)) return;

        try {
            localStorage.setItem(CLAVE_TEMA, temaSeleccionado);
        } catch (error) {
            console.warn("No se pudo guardar el tema:", error);
        }

        aplicarTema();
    });
});

sistema.addEventListener("change", () => {
    if (temaSeleccionado === "system") {
        aplicarTema();
    }
});
