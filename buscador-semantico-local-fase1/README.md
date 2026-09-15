# SemanticSearch Local — Fase 2

Buscador semántico local de documentos.

## Tecnologías

- HTML
- CSS
- JavaScript ES Modules
- Transformers.js
- ONNX Runtime Web mediante Transformers.js
- PDF.js
- Web Cache API del navegador

## Formatos

- TXT
- MD
- CSV
- JSON
- PDF

## Modelo

Se utiliza:

`Xenova/paraphrase-multilingual-MiniLM-L12-v2`

Es un modelo de embeddings multilingüe disponible para Transformers.js.
Está elegido porque el proyecto trabajará principalmente con textos en español.

El modelo genera embeddings de 384 dimensiones y la aplicación utiliza
pooling `mean` y normalización para producir los vectores.

## Cómo funciona

```text
Documento
   ↓
Extracción de texto
   ↓
Fragmentación
   ↓
Modelo de embeddings
   ↓
Vector de 384 dimensiones
   ↓
Almacenamiento temporal en memoria
```

Consulta:

```text
Pregunta del usuario
   ↓
Embedding
   ↓
Similitud coseno
   ↓
Ranking
   ↓
Top-K resultados
```

## ¿Es realmente local?

Sí en cuanto a la inferencia: el modelo se ejecuta dentro del navegador y
los documentos del usuario se procesan dentro del navegador. No existe un
backend propio ni una API de embeddings.

La primera vez que se ejecuta, Transformers.js descarga los archivos del
modelo desde Hugging Face y el navegador puede guardarlos en su caché.
Después de esa primera descarga, el modelo puede reutilizarse desde la caché.

### Para una versión completamente offline

En una fase posterior se puede descargar/bundlear el modelo y configurar
Transformers.js para `local_files_only: true`. Eso elimina la necesidad de
descargar el modelo durante la ejecución.

## Ejecutar

No abras `index.html` directamente con `file://`.

Usa un servidor local.

### VS Code

Instala Live Server y abre `index.html`.

### Python

```bash
python -m http.server 5500
```

Luego:

```text
http://localhost:5500
```

## Primera ejecución

La primera carga del modelo puede tardar y consumir bastante ancho de banda.
Es normal.

Cuando aparezca:

`Modelo listo · embeddings locales`

puedes cargar documentos.

## Prueba recomendada

Carga dos o tres documentos en español.

Ejemplo:

```text
Documento 1:
La inteligencia artificial permite crear sistemas capaces
de aprender patrones a partir de grandes cantidades de datos.

Documento 2:
JavaScript permite construir interfaces web interactivas.

Documento 3:
Las redes neuronales artificiales utilizan capas de neuronas
para transformar información y aprender representaciones.
```

Busca:

`¿Qué tecnología permite que una máquina aprenda de los datos?`

El resultado debería priorizar semánticamente el documento relacionado
con inteligencia artificial.

## Seguridad

Los textos se muestran mediante `textContent` y elementos creados con
`createElement`, evitando interpretar contenido de usuario como HTML.

## Almacenamiento

`localStorage` se utiliza únicamente para preferencias como:

- cantidad de resultados
- umbral de similitud

Los documentos y embeddings permanecen en memoria durante la sesión.

## Próximas mejoras

- Resaltar el fragmento encontrado.
- Mostrar página exacta en resultados PDF.
- Persistencia opcional de embeddings en IndexedDB.
- Modo completamente offline con modelo local empaquetado.
- Web Worker para evitar bloquear la interfaz al procesar muchos documentos.
- WebGPU como aceleración opcional en equipos compatibles.
