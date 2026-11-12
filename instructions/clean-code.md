# Clean Code — reglas verificables

> Cada regla debe poder comprobarse en un review o con un lint. Si no se puede comprobar, no es regla.

## Tamaño y forma

| Regla                              | Límite                             | Lo hace cumplir                            |
| ---------------------------------- | ---------------------------------- | ------------------------------------------ |
| Líneas por función                 | ≤ 30                               | ESLint `max-lines-per-function`            |
| Líneas por archivo                 | ≤ 250                              | ESLint `max-lines`                         |
| Parámetros por función             | ≤ 3 (si son más, un objeto tipado) | ESLint `max-params`                        |
| Anidamiento                        | ≤ 2 niveles                        | ESLint `max-depth`                         |
| Complejidad ciclomática            | ≤ 8                                | ESLint `complexity`                        |
| `else` después de `return`/`throw` | prohibido                          | ESLint `no-else-return`                    |
| `any`                              | prohibido (`unknown` + narrowing)  | `@typescript-eslint/no-explicit-any`       |
| Non-null assertion `!`             | prohibido                          | `@typescript-eslint/no-non-null-assertion` |
| `console.*`                        | prohibido (usar el logger)         | ESLint `no-console`                        |

## Flujo de control: guard clauses + mapas, no cascadas de `if`

1. **Guard clauses al inicio**: se valida y se sale temprano. El camino feliz queda al final, sin indentar.
2. **Si el `if`/`switch` decide _qué hacer_ según un tipo, estado o código → se usa un mapa de estrategias** (`Record<Clave, Estrategia>`). Agregar un caso es agregar una entrada al mapa, no tocar la lógica (principio abierto/cerrado).
3. Con `Record<UnionType, ...>` TypeScript obliga a cubrir todas las claves: si alguien agrega un estado nuevo y olvida su estrategia, **no compila**.

```ts
// ❌ Prohibido
if (currency === 'USD') { fee = amount.mul(0.01) }
else if (currency === 'VES') { fee = amount.mul(0.02) }
else if (currency === 'USDT') { ... }

// ✅ Estrategia por mapa
const FEE_STRATEGIES: Record<Currency, FeeStrategy> = {
  USD:  (amount) => amount.mul('0.01'),
  VES:  (amount) => amount.mul('0.02'),
  USDT: (amount) => amount.mul('0.005'),
};
const fee = FEE_STRATEGIES[currency](amount);
```

## Nombres

- Se nombra por intención de negocio: `allocateSupplierFunds`, no `processData`.
- Booleanos con prefijo `is/has/can/should`.
- Nada de abreviaturas crípticas (`op`, `amt`, `tmp`), salvo convenciones universales (`id`, `url`).
- Sin números mágicos: las constantes van con nombre (`TROY_OUNCE_IN_GRAMS`, `MAX_KYC_FILE_BYTES`).

## Funciones

- Hacen una cosa. Si el nombre necesita un "y", son dos funciones.
- Las del dominio son puras cuando se puede: sin I/O, sin mutar argumentos, sin leer el reloj.
- No reciben flags booleanos que cambien su comportamiento: en su lugar van dos funciones o una estrategia.
- Inmutabilidad por defecto: `readonly` en las props de entidades y VOs, `as const` en los mapas.

## Comentarios

- El código se explica solo; los comentarios explican **por qué** (una regla de negocio o un requisito regulatorio), nunca **qué**.
- No se deja código comentado. Git lo recuerda.
- Un `TODO` debe llevar el ticket (`TODO(ARB-123): ...`).

## Commits

- Commits atómicos de **≤ 10 archivos**, con mensaje convencional: `feat(arbitrage): calcula margen neto | ARB-12`.
- Prohibido el `git add .` masivo sin revisar el diff.
