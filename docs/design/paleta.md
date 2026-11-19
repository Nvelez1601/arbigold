# Paleta de colores de ArbiGold

Fuente única: `apps/frontend/src/app/theme/palette.ts`. `styles.css` (Tailwind) y el preset de
PrimeVue derivan de ahí, y `palette.spec.ts` **falla** si divergen o si un rol deja de cumplir el
contraste WCAG AA.

La identidad es violeta profundo con rosa orquídea: el degradado violeta → rosa es la firma de la
marca y Sora/DM Sans son la tipografía (display y cuerpo).

## Regla de uso

| Uso             | Tono                               | Colores                                                                                                                                                                         |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Fondos**      | Claros                             | Página `violet-mist #faf8fd` · tarjetas `#ffffff` · zonas secundarias y hover `lavender #f3eefb` · líneas `lavender-line #e8e1f4`                                               |
| **Texto**       | Oscuros                            | Títulos `midnight-violet #2a1b3d` · cuerpo `#4a3f58` · atenuado `slate-violet #766a8c`                                                                                          |
| **Componentes** | Medios                             | Botón primario `royal-violet #6d3fd1` (hover `deep-violet #4b2a9b`) · secundario `rose-shadow #c23f80` · acento `iris #6b4a9e` · enlaces `royal-violet`                         |
| **Detalles**    | Opuestos                           | Degradado `deep-violet → royal-violet → orchid` (`bg-brand-gradient`) · segundo acento `orchid #e8579b` (`bg-pink-gradient`) · bordes de campos `#9483b2` · foco `royal-violet` |
| **Estados**     | Agregados (no venían en la paleta) | éxito `#0f7350` · advertencia `#8a5600` · peligro `#c23450` (saldos negativos, mermas) · info `royal-violet`                                                                    |

## Contrastes verificados (WCAG 2.1)

| Combinación                                     | Ratio              | Nivel                |
| ----------------------------------------------- | ------------------ | -------------------- |
| midnight-violet sobre el fondo                  | 15.05              | AAA                  |
| texto de cuerpo sobre el fondo                  | 9.29               | AAA                  |
| texto atenuado sobre tarjetas                   | 4.99               | AA                   |
| blanco sobre royal-violet (botón primario)      | 6.40               | AA                   |
| blanco sobre deep-violet (hover)                | 9.98               | AAA                  |
| blanco sobre rose-shadow (botón secundario)     | 4.86               | AA                   |
| blanco sobre iris (acento)                      | 6.78               | AAA                  |
| borde de campo `#9483b2` sobre tarjeta          | 3.42               | AA componentes (≥ 3) |
| éxito / advertencia / peligro con texto blanco  | 5.85 / 6.16 / 5.38 | AA                   |
| blanco sobre orchid (detalle, no texto pequeño) | 3.35               | AA componentes (≥ 3) |

## Lo que NO se hace

- **`blush #fde8f2` y `lavender-line #e8e1f4` nunca van como color de texto** (1.17 y 1.27 sobre
  blanco). Solo como fondo con texto oscuro encima, en divisores o en superficies destacadas.
- **`orchid` no se usa para texto pequeño sobre blanco** (3.35): es para botones grandes, gráficos,
  pills y detalles del degradado.
- No hay modo oscuro todavía: `color-scheme: light` está fijo en `styles.css`.

## Uso en código

```html
<button class="bg-primary-600 text-white hover:bg-primary-700">Guardar</button>
<span class="text-danger">-0.86 g</span>
<header class="bg-brand-gradient text-white">…</header>
<section class="rounded-2xl border border-border bg-surface-0">…</section>
```

En componentes de PrimeVue no hace falta nada: el preset `ArbiGoldPreset` ya aplica la paleta.
