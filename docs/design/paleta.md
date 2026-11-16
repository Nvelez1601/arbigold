# Paleta de colores de ArbiGold

Fuente única: `apps/frontend/src/app/theme/palette.ts`. `styles.css` (Tailwind) y el preset de
PrimeVue derivan de ahí, y `palette.spec.ts` **falla** si divergen o si un rol deja de cumplir el
contraste WCAG AA.

## Regla de uso

| Uso             | Tono                               | Colores                                                                                                                                                                                                 |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fondos**      | Claros                             | Página `#eff4f6` (alice-blue aclarado) · tarjetas `#ffffff` · zonas secundarias, encabezados de tabla y hover `alice-blue #d7e4e8`                                                                      |
| **Texto**       | Oscuros                            | Títulos `space-indigo #21295c` · cuerpo `charcoal-blue #3d414a` · atenuado `#686f76`                                                                                                                    |
| **Componentes** | Medios                             | Botón primario `baltic-blue #065a82` (hover `regal-navy`, activo `yale-blue`) · secundario `cerulean #1c7293` · enlaces `baltic-blue`                                                                   |
| **Detalles**    | Opuestos                           | Degradado `space-indigo → regal-navy → baltic-blue → cerulean` (`bg-brand-gradient`) · acento `dusty-lavender #806d91` · divisores `powder-blue #9eb3c2` · bordes de campos `#878f96` · foco `cerulean` |
| **Estados**     | Agregados (no venían en la paleta) | éxito `#1f7a57` · advertencia `#9a5b00` · peligro `#b42332` (saldos negativos, mermas) · info `baltic-blue`                                                                                             |

## Contrastes verificados (WCAG 2.1)

| Combinación                                     | Ratio              | Nivel                |
| ----------------------------------------------- | ------------------ | -------------------- |
| space-indigo sobre el fondo                     | 12.33              | AAA                  |
| charcoal-blue sobre el fondo                    | 9.22               | AAA                  |
| texto atenuado sobre tarjetas                   | 5.09               | AA                   |
| blanco sobre baltic-blue (botón primario)       | 7.52               | AAA                  |
| blanco sobre regal-navy (hover)                 | 11.04              | AAA                  |
| blanco sobre cerulean (botón secundario)        | 5.42               | AA                   |
| blanco sobre dusty-lavender (acento)            | 4.65               | AA                   |
| borde de campo `#878f96` sobre tarjeta          | 3.28               | AA componentes (≥ 3) |
| éxito / advertencia / peligro, con texto blanco | 5.28 / 5.43 / 6.51 | AA                   |

## Lo que NO se hace

- **`steel-blue` y `powder-blue` nunca van como color de texto** (2.92 y 2.17 sobre blanco). Solo
  como fondo con texto oscuro encima (`space-indigo` sobre `powder-blue` = 6.30), en divisores o
  en gráficos.
- **`alice-blue` no sirve para bordes** (1.17 sobre el fondo): es para superficies.
- No hay modo oscuro todavía: `color-scheme: light` está fijo en `styles.css`.

## Uso en código

```html
<button class="bg-primary-600 text-white hover:bg-primary-700">Guardar</button>
<span class="text-danger">-0.86 g</span>
<header class="bg-brand-gradient text-white">…</header>
```

En componentes de PrimeVue no hace falta nada: el preset `ArbiGoldPreset` ya aplica la paleta.
