# SEO Factory

SEO Factory es el repositorio central para operar múltiples sitios de contenido que viven en GitHub y se despliegan en Vercel.

El objetivo inicial no es publicar contenido de forma autónoma. Primero se documenta un flujo manual, repetible y auditable. Cuando ese flujo demuestra calidad, se automatiza por etapas.

## Principios

- Un solo sistema central para todos los sitios.
- Configuración específica por sitio.
- Git como historial y sistema de aprobación.
- Pull requests antes de publicar cambios importantes.
- Agentes pequeños con responsabilidades claras.
- Calidad editorial antes que volumen.
- Automatización progresiva, nunca ciega.

## Estructura inicial

```text
seo-factory/
├── AGENTS.md
├── README.md
├── agents/
├── docs/
├── knowledge/
├── prompts/
├── sites/
├── templates/
├── contracts/
└── workflows/
```

## Primera meta

Configurar un sitio piloto y ejecutar manualmente este flujo:

1. Registrar la configuración del sitio.
2. Proponer oportunidades de contenido.
3. Seleccionar una keyword.
4. Crear investigación y outline.
5. Redactar el artículo.
6. Revisar SEO, estilo y exactitud.
7. Validar el diff, el build y el inventario de URLs.
8. Hacer push fast-forward a `main` y verificar el despliegue de Vercel.

## Orden de implementación

1. Base documental.
2. Sitio piloto.
3. Keyword Agent manual.
4. Research y Outline.
5. Writer y Editor.
6. Publicación automática segura a `main`.
7. Imágenes.
8. Analítica y actualización.
9. Automatización programada.

## Cerebro central

Toda ejecución comienza en `agents/ORCHESTRATOR_AGENT/README.md`. El orquestador
carga el contrato del sitio, inventaria sus URLs y solo permite dos operaciones:

- crear un artículo dentro de una ruta editorial aprobada;
- optimizar el contenido SEO de una página existente sin cambiar su URL.

Las barreras obligatorias están en `knowledge/URL_AND_SCOPE_GUARDRAILS.md` y el
flujo objetivo en `workflows/AUTOMATED_CONTENT_FLOW.md`. Si una web no declara
qué se puede editar y qué debe protegerse, el sistema no escribe.

## Estado

Fase 1: arquitectura documental, orquestador y contrato de seguridad por sitio.

## Validar un sitio

El preflight comprueba que el contrato sea seguro y esté completo antes de una
ejecución editorial:

```bash
npm install
npm run preflight -- verifiedtitles
```

Mientras un sitio permanezca en validación manual, el resultado esperado es
`blocked` con una lista explícita de los requisitos pendientes.

## Validar handoffs editoriales

Research, Writer, Editor y SEO Review se comunican mediante contratos JSON:

```bash
npm run validate:handoff -- research work/research.json
npm run validate:handoff -- draft work/draft.json
npm run validate:handoff -- editorial_review work/editorial-review.json
npm run validate:handoff -- seo_review work/seo-review.json
```

Ninguna etapa puede saltarse ni publicar con claims pendientes, fuentes
insuficientes o una revisión incompleta.

## Ejecutar el pipeline

El ejecutor mantiene un manifest y una máquina de estados por corrida:

```bash
npm run pipeline -- init \
  --site verifiedtitles \
  --operation optimize_existing_page \
  --target-url /what-is-a-title-company/

npm run pipeline -- submit --run work/runs/<run_id> --stage research --file research.json
npm run pipeline -- submit --run work/runs/<run_id> --stage draft --file draft.json
npm run pipeline -- submit --run work/runs/<run_id> --stage editorial_review --file editorial-review.json
npm run pipeline -- submit --run work/runs/<run_id> --stage seo_review --file seo-review.json
npm run pipeline -- technical --run work/runs/<run_id> --file technical-validation.json
npm run pipeline -- package --run work/runs/<run_id>
```

`init` sólo funciona cuando el preflight del sitio devuelve `ready`. `package`
vuelve a calcular los hashes de todos los artefactos y se bloquea si alguno fue
alterado después de aprobarse.

`init` también aplica la cadencia declarada en `automation.cadence` (por
defecto, un artículo por día por sitio) y bloquea con un mensaje explícito si
ya se alcanzó el límite. Ver `contracts/SITE_CONTRACT.md`.

## Ver el estado de todos los sitios

Con más de un sitio dado de alta, un solo comando muestra el estado del
contrato, la automatización, la cadencia y el historial de publicaciones de
cada uno:

```bash
npm run sites:report
```

Termina con `exit 1` si algún sitio no está `ready`, para poder usarlo como
gate antes de una tanda de corridas. `sites/_template/` tiene el contrato base
y el checklist para dar de alta un sitio nuevo.

## Auditoría de cada publicación

Después de un push exitoso, el Publisher Agent registra automáticamente un
resumen auditable en `sites/<site_id>/runs/<fecha>-<slug>.yaml`: keyword
principal, fuentes citadas, archivos cambiados, resultado del build y
comparación de inventario de URLs antes/después. Este registro sí se versiona
en Git (a diferencia de `work/runs/`, que es local y transitorio) y es la base
para auditar retroactivamente por qué se publicó algo si una página pierde
posiciones.
