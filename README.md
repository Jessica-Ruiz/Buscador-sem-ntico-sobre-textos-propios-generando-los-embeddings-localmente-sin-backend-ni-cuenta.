# SemanticSearch Local

**Buscador semántico de documentos con embeddings locales**

## Descripción

SemanticSearch Local es una aplicación web que permite cargar documentos y buscar información según el significado de las consultas, sin depender únicamente de coincidencias exactas de palabras.

La aplicación utiliza un modelo de inteligencia artificial que se ejecuta directamente en el navegador para generar representaciones vectoriales (embeddings) del contenido de los documentos y de las consultas.

El proyecto integra JavaScript moderno, Node.js, Express, Bootstrap, almacenamiento web y comunicación cliente-servidor.

## Objetivo

Desarrollar una aplicación web que permita procesar documentos propios y recuperar fragmentos relevantes mediante búsqueda semántica, utilizando embeddings generados localmente en el navegador.

## Tecnologías utilizadas

- HTML5 y CSS3 para la estructura y presentación.
- JavaScript moderno y módulos ES (`.mjs`).
- Bootstrap 5.3.3 para el diseño adaptable.
- Node.js y Express 5 para el servidor web.
- Transformers.js 3.7.2 para la ejecución del modelo de embeddings.
- ONNX Runtime Web para la inferencia en el navegador.
- PDF.js 4.10.38 para extraer texto de archivos PDF.
- `localStorage` y `sessionStorage` para almacenar preferencias y datos temporales.
- Git y GitHub para el control de versiones.
- Render para el despliegue.

## Funcionalidades principales

La aplicación permite:

1. Seleccionar documentos desde el equipo.
2. Procesar archivos TXT, MD, CSV, JSON y PDF.
3. Extraer el contenido textual y dividirlo en fragmentos.
4. Generar embeddings mediante un modelo local.
5. Realizar consultas en lenguaje natural.
6. Comparar la consulta con los fragmentos mediante similitud coseno.
7. Mostrar resultados ordenados según su relevancia.
8. Configurar la cantidad de resultados y el umbral de similitud.
9. Visualizar el progreso del procesamiento.
10. Cancelar operaciones y eliminar documentos de la sesión.

## Arquitectura

SemanticSearch Local utiliza una arquitectura cliente-servidor.

**Frontend:** administra la interfaz, los documentos seleccionados, la extracción de texto, la generación de embeddings y la búsqueda semántica.

**Backend:** utiliza Node.js y Express para servir los archivos de la aplicación y proporcionar rutas HTTP para consultar el estado del servidor y validar las consultas.

**Modelo de inteligencia artificial:** se ejecuta en el navegador. El servidor entrega sus archivos, pero no realiza la inferencia.

### Rutas del servidor

| Método | Ruta | Función |
|---|---|---|
| GET | `/` | Entrega la aplicación web |
| GET | `/api/estado` | Devuelve el estado del servidor |
| POST | `/api/consulta` | Recibe y valida una consulta |
| GET | `/js`, `/css`, `/models` | Sirve recursos estáticos |

La comunicación con las rutas de API utiliza `fetch`, `async/await` y respuestas JSON.

## Modelo de embeddings

El proyecto utiliza:

`Xenova/paraphrase-multilingual-MiniLM-L12-v2`

Este modelo permite representar textos mediante vectores de 384 dimensiones.

Se utiliza una versión cuantizada `q8` para ejecutar la inferencia en el navegador.

El modelo se carga bajo demanda: la aplicación no necesita inicializarlo al abrir la página, sino cuando se requiere procesar documentos.

## Instalación y ejecución

### Requisitos

- Node.js y npm.
- Un navegador moderno compatible con WebAssembly.
- Conexión a Internet para instalar dependencias y preparar los archivos del modelo.

### Instalación

Clonar el repositorio:

```bash
git clone https://github.com/Jessica-Ruiz/Buscador-sem-ntico-sobre-textos-propios-generando-los-embeddings-localmente-sin-backend-ni-cuenta..git
```

Ingresar a la carpeta de la aplicación:

```bash
cd "Proyecto desarrollo web/buscador-semantico-local-fase1"
```

Instalar las dependencias:

```bash
npm ci
```

Preparar el modelo:

```bash
npm run download:model
```

Iniciar el servidor:

```bash
npm start
```

Abrir en el navegador:

`http://localhost:3000`

### Descarga del modelo

El script `descargar-modelo.mjs` descarga los archivos necesarios desde Hugging Face y los guarda en:

`models/Xenova/paraphrase-multilingual-MiniLM-L12-v2/`

Entre ellos se encuentran la configuración, los archivos del tokenizador y el modelo ONNX cuantizado.

Si los archivos ya existen, el script evita descargarlos nuevamente.

## Funcionamiento de la búsqueda

1. El usuario selecciona uno o varios documentos.
2. La aplicación extrae el contenido textual.
3. El contenido se divide en fragmentos.
4. El navegador genera un embedding para cada fragmento.
5. El usuario escribe una consulta.
6. La aplicación genera un embedding de la consulta.
7. Se calcula la similitud entre la consulta y los fragmentos.
8. Los resultados se ordenan y filtran según el umbral configurado.

La búsqueda se realiza sobre los documentos procesados durante la sesión de uso.

## Almacenamiento y privacidad

La aplicación utiliza dos mecanismos de almacenamiento del navegador:

- **localStorage:** conserva preferencias como la cantidad de resultados y el umbral de similitud.
- **sessionStorage:** conserva temporalmente la última consulta.

Los documentos y sus embeddings se procesan en el navegador y no se envían al servidor para generar vectores.

El servidor recibe el texto de las consultas mediante `/api/consulta` para su validación.

Los documentos procesados no se guardan automáticamente para recuperarlos en futuras sesiones.

## Seguridad

El servidor incorpora medidas como:

- Validación de las consultas recibidas.
- Restricción de la longitud de las consultas.
- Respuestas HTTP con códigos adecuados.
- Manejo de errores de solicitudes JSON.
- Política de seguridad de contenido (CSP).
- Encabezados `X-Content-Type-Options` y `X-Frame-Options`.
- Configuración inicial de HSTS en producción.
- Restricción de recursos publicados por Express.

La aplicación utiliza operaciones seguras sobre el DOM para presentar contenido textual.

## Optimización del rendimiento

Se implementaron optimizaciones como:

- Carga bajo demanda del modelo de embeddings.
- Compresión HTTP mediante `compression`.
- Reutilización del modelo cargado.
- Almacenamiento en caché del modelo en el navegador.
- Procesamiento progresivo de fragmentos.

### Resultados de Lighthouse

En las pruebas realizadas sobre la aplicación publicada se obtuvieron los siguientes resultados:

| Categoría | Puntuación |
|---|---:|
| Performance | 98/100 |
| Accessibility | 100/100 |
| Best Practices | 100/100 |
| SEO | 100/100 |

La puntuación de rendimiento pasó de 68 a 98 después de optimizar la inicialización del modelo.

Estas puntuaciones corresponden a las mediciones realizadas durante las pruebas y pueden variar según el dispositivo y las condiciones de ejecución.

## Despliegue

La aplicación está publicada mediante Render.

**Aplicación:**  
https://buscador-sem-ntico-sobre-textos-propios.onrender.com/

**Repositorio:**  
https://github.com/Jessica-Ruiz/Buscador-sem-ntico-sobre-textos-propios-generando-los-embeddings-localmente-sin-backend-ni-cuenta.

El proceso de construcción en Render utiliza:

```bash
npm ci && npm run download:model
```

El comando de inicio es:

```bash
npm start
```

## Limitaciones

- Los archivos PDF escaneados sin texto extraíble requieren OCR, que no está implementado.
- La primera carga del modelo puede tardar dependiendo del dispositivo y la conexión.
- El procesamiento de documentos grandes puede consumir una cantidad considerable de memoria.
- La calidad de los resultados depende del contenido, la formulación de la consulta y el umbral de similitud.
- Los documentos procesados no se recuperan automáticamente al cerrar y volver a abrir la aplicación.

## Contexto académico

Proyecto desarrollado para la asignatura de Desarrollo Web de la Fundación Universitaria UNISANGIL, sede Chiquinquirá, en el programa de Ingeniería de Sistemas.

El proyecto integra los contenidos de JavaScript moderno, DOM, eventos, almacenamiento web, comunicación cliente-servidor, Node.js, Express, Bootstrap, seguridad, Git, GitHub, optimización y despliegue.