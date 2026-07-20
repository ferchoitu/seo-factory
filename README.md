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
7. Abrir un pull request en el repositorio del sitio.
8. Aprobar, fusionar y dejar que Vercel despliegue.

## Orden de implementación

1. Base documental.
2. Sitio piloto.
3. Keyword Agent manual.
4. Research y Outline.
5. Writer y Editor.
6. Publicación mediante pull request.
7. Imágenes.
8. Analítica y actualización.
9. Automatización programada.

## Estado

Fase 1: arquitectura documental y primer agente.
