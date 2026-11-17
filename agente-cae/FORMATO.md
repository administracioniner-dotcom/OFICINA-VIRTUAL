# Formato de la base de conocimiento

Cada `conocimiento/<categoría>.json` es una **lista** de registros. `node agente-cae/validar.mjs` comprueba todo esto.

## Campos comunes (todos los ficheros)
| Campo | Valores |
|---|---|
| `id` | texto único dentro del fichero (por ejemplo `normativa-2026-orden-xyz`) |
| `fecha_consulta` | `AAAA-MM-DD`, real y no futura |
| `fuente` | `{ "nombre": "BOE", "url": "https://…", "tipo": "oficial" \| "comercial" \| "otra" }` |
| `fiabilidad` | `verificado` (fuente directa comprobable) · `referencia_publica` (publicado, con condiciones) · `estimacion` (deducido) · `no_confirmado` |
| `clasificacion` | `hecho` · `interpretacion` · `hipotesis` · `estimacion` |

## Campos por fichero
- **normativa.json**: `titulo`, `estado` (`aprobada`, `borrador`, `propuesta`, `consulta_publica`, `derogada`), `fecha_publicacion` (obligatoria si `aprobada`), `entrada_en_vigor` (fecha o `null`), `afecta_a` (lista), `impacto_iner`, `oportunidades_riesgos`.
- **fichas.json**: `codigo` (único), `denominacion`, `sector` (`residencial` o `industrial`), `version` y `fecha_ficha` (texto/fecha, o `null` si la web no las publica: nunca se rellenan con la fecha de consulta), `formula_oficial` (texto copiado de la ficha oficial o `null`; solo con fuente `oficial`). Se pueden añadir más campos (requisitos, variables, documentación…) pero los anteriores son obligatorios.
- **precios.json** (fase 5): `empresa`, `tipo_empresa`, `actuacion`, `precio` (número), `unidad` (`€/CAE` o `€/MWh`), `condiciones` (texto, puede ir vacío).
- **oportunidades.json**: `descripcion`, `potencial_comercial`, `dificultad`, `recursos`, `recomendacion`, `estado` (`pendiente_revision`, `revisada`, `descartada`).
- **empresas.json** (fase 5): `nombre`, `rol`, `rol_comprobado` (`true`/`false`).
- **alertas.json**: `titulo`.
- **res060.json, factores.json, verificadores.json**: solo los campos comunes por ahora; se definirán en su fase.

## Ejemplo (normativa)
```json
{
  "id": "normativa-ejemplo-001",
  "fecha_consulta": "2026-11-17",
  "fuente": { "nombre": "BOE", "url": "https://www.boe.es/…", "tipo": "oficial" },
  "fiabilidad": "verificado",
  "clasificacion": "hecho",
  "titulo": "…",
  "estado": "aprobada",
  "fecha_publicacion": "2026-10-01",
  "entrada_en_vigor": null,
  "afecta_a": ["RES060"],
  "impacto_iner": "…",
  "oportunidades_riesgos": "…"
}
```
(El ejemplo es solo de formato: no es un dato real.)
