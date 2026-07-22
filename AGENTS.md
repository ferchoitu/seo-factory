# Instrucciones maestras para Codex

## Misión

Ayudar a construir y operar SEO Factory como un sistema central, modular y auditable para múltiples sitios web.

## Reglas obligatorias

1. Leer `README.md`, este archivo y la documentación relevante antes de modificar el repositorio.
2. No automatizar un flujo que todavía no haya sido validado manualmente.
3. No publicar directamente en los repositorios de producción sin una instrucción explícita.
4. Publicar contenido editorial validado directamente a `main`; usar ramas y pull requests para infraestructura, estructura o cambios masivos.
5. No inventar datos de volumen, dificultad, tráfico, ingresos, productos ni fuentes.
6. Distinguir claramente entre datos verificados, estimaciones e hipótesis.
7. Mantener una sola responsabilidad por agente.
8. Evitar contenido duplicado, páginas huérfanas y canibalización de keywords.
9. Respetar la configuración y la voz de cada sitio.
10. Registrar decisiones importantes y cambios de workflow.
11. No cambiar, eliminar, redirigir ni reutilizar una URL existente.
12. Crear contenido nuevo únicamente dentro de las rutas editoriales declaradas por el sitio.
13. En páginas existentes, limitar los cambios a contenido SEO, metadata y enlaces internos permitidos.
14. Detener la ejecución si la configuración del sitio está incompleta o si el diff afecta archivos protegidos.

## Secuencia de trabajo

Antes de ejecutar una tarea:

1. Identificar el sitio objetivo.
2. Leer `sites/<sitio>/config.yaml`.
3. Leer las reglas globales en `knowledge/`.
4. Leer la documentación del agente correspondiente.
5. Inspeccionar el repositorio del sitio cuando la tarea afecte contenido o código.
6. Explicar brevemente el alcance.
7. Ejecutar el cambio mínimo suficiente.
8. Validar formato, enlaces, frontmatter y build cuando corresponda.
9. Dejar un resumen verificable.

Antes de escribir, el `ORCHESTRATOR_AGENT` debe clasificar la tarea como
`create_article` o `optimize_existing_page`. Cualquier otra clase queda fuera del
alcance automático.

## Política editorial

El contenido debe resolver una intención real, aportar información útil y estar diseñado para una persona antes que para un motor de búsqueda. No se permite inflar artículos con repeticiones, introducciones vacías, FAQs redundantes ni afirmaciones sin fundamento.

## Política de Git

- `main` debe permanecer estable.
- Una ejecución editorial automática puede crear un commit y hacer push fast-forward a `main` después de aprobar todos los controles.
- Nunca usar force-push ni publicar si el SHA remoto de `main` cambió durante la ejecución.
- Usar ramas con prefijo `codex/`, `content/`, `seo/` o `fix/` para infraestructura, estructura o trabajo masivo.
- Un pull request de trabajo no editorial debe explicar qué cambió, por qué y cómo se verificó.
- No mezclar cambios de infraestructura con lotes grandes de contenido.

## Política de autonomía

Codex puede analizar, proponer, documentar, preparar y publicar cambios editoriales
directamente a `main` cuando el contrato del sitio está habilitado y todas las
validaciones terminan correctamente. Nunca puede usar force-push, cambiar URLs,
modificar archivos protegidos ni actualizar varios sitios en una misma ejecución.

Cuando la ejecución la dispara una rutina programada (cron), sin un humano
revisando entre etapas, es obligatorio seguir
`agents/ORCHESTRATOR_AGENT/AUTOMATED_RUN_PLAYBOOK.md`: Research, Writer,
Editorial Review y SEO Review deben ser invocaciones de sub-agente separadas e
independientes entre sí, nunca pasos dentro del razonamiento de una única
sesión. Un `blocked` en cualquier etapa termina la corrida sin publicar y sin
reintentar dentro de la misma ejecución.
