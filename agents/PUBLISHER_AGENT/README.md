# Publisher Agent

## Misión

Publicar un único cambio editorial validado mediante push fast-forward a `main`,
sin modificar el contenido recibido ni resolver conflictos automáticamente.

## Entradas obligatorias

- `publication-package.json` con estado `ready_for_publisher`;
- manifest del run y artefactos cuyos hashes coincidan con el paquete;
- `site_id` y repositorio objetivo;
- operación `create_article` u `optimize_existing_page`;
- SHA de `origin/main` capturado en preflight;
- inventarios de URLs anterior y posterior;
- diff completo y lista de archivos editables/protegidos;
- resultado aprobado de build y validaciones;
- URL objetivo y fuentes utilizadas.

Si falta una entrada, el resultado es `blocked`.

Publisher debe recalcular los hashes antes de operar. Una discrepancia entre el
paquete, el manifest o cualquier artefacto bloquea la publicación.

## Pre-push obligatorio

1. Confirmar que sólo se opera sobre una web.
2. Confirmar árbol limpio antes de aplicar el cambio.
3. Confirmar que el diff sólo contiene rutas editables.
4. Confirmar que ningún archivo protegido cambió.
5. Confirmar que todas las URLs anteriores siguen presentes.
6. Confirmar que rutas, slugs y canonicals anteriores son idénticos.
7. Confirmar que las URLs nuevas están bajo una raíz editorial permitida.
8. Ejecutar nuevamente las validaciones y el build declarados.
9. Ejecutar `git fetch origin main` y comparar `origin/main` con el SHA inicial.
10. Bloquear si el remoto cambió o si el commit no sería fast-forward.

## Publicación

1. Crear un único commit con mensaje que identifique operación y URL objetivo.
2. Verificar que el commit sólo contiene los archivos aprobados.
3. Ejecutar `git push origin HEAD:main` sin opciones de fuerza.
4. Guardar los SHA anterior y posterior.

## Ejecución

El ejecutor recibe un checkout limpio y un directorio separado con exactamente los
archivos aprobados. Sus hashes deben estar declarados en
`technical_validation.json` bajo `changed_file_sha256`.

Primero se ejecuta sin `--publish`; este modo valida paquete, hashes, remoto, rama,
limpieza y concurrencia sin modificar el checkout:

```bash
npm run publisher -- \
  --run work/runs/<run_id> \
  --repository /ruta/al/checkout \
  --changes /ruta/a/approved-changes
```

La publicación real requiere además `--publish` y un contrato de sitio en estado
`ready`. Si `automation.enabled` está en `false`, el push queda bloqueado.

Nunca utilizar `--force`, `--force-with-lease`, merge automático, rebase automático
ni resolución automática de conflictos.

## Verificación posterior

1. Esperar el resultado del proveedor de despliegue.
2. Confirmar HTTP exitoso en la URL objetivo.
3. Confirmar title, description, canonical, robots y enlaces principales.
4. Confirmar que las URLs anteriores críticas siguen respondiendo.
5. Guardar un registro verificable de publicación.

Si falla una comprobación posterior al push, registrar `published_with_incident`,
detener nuevas publicaciones para el sitio y solicitar intervención. No intentar un
rollback automático, porque otro despliegue puede haber avanzado mientras tanto.

## Salidas

- `published`: push y deploy verificados;
- `blocked`: no se publicó nada;
- `published_with_incident`: el push ocurrió pero falló la comprobación posterior.
