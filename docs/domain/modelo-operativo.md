# Modelo operativo de ArbiGold

> Interpretación de las reuniones de levantamiento (2026-11-02 y 2026-11-03) y de los registros
> operativos en Excel que comparte el negocio. **El repo es público:** aquí se describen roles,
> estructuras y fórmulas; nunca nombres reales de clientes, proveedores ni montos.
> Todas las fórmulas se verificaron contra filas reales de esos registros; los ejemplos de este
> documento y de los tests son **ficticios**.

## 1. El negocio en una frase

Un **proveedor** adelanta dinero (USDT). Ese dinero se le consigna a un **cliente** a un precio
cerrado en gramos de oro fino. El cliente paga **entregando oro** pieza por pieza en un
**packing list**. Las piezas se consolidan en una **exportación** hacia el comprador o proveedor,
la **refinería** confirma la pureza real y las diferencias se liquidan con cada parte.
La ganancia es el **diferencial de porcentajes**: el cliente compra más barato (p. ej. al 96.5 %
del precio internacional) que el precio al que se cierra con el proveedor (p. ej. al 97 %).

## 2. Actores

| Actor                  | Qué es                                                           | En los registros                                                                                   |
| ---------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Cliente**            | Recibe fondos para comprar oro y salda su deuda entregándolo     | Una hoja de cuenta corriente por cliente; una hoja de piezas por cliente en el consolidado semanal |
| **Proveedor**          | Adelanta los fondos (USDT) y recibe el oro exportado             | Hojas "PROVEEDOR" con operaciones (cierres) y entregas (envíos)                                    |
| **Refinería**          | Funde y analiza el oro en destino; su resultado es el definitivo | Columnas "RESULTADOS DE REFINERÍA" en cada envío                                                   |
| **Custodio / guardia** | Traslada y resguarda las piezas                                  | Columna "GUARDIA" por pieza en las exportaciones                                                   |

Roles internos (no son entidades del sistema, son usuarios con permisos): compras, verificación
de pureza en Caracas, pagos y tesorería, documentación de exportación y dirección.

## 3. Conceptos

| Concepto                    | Definición                                                                                                                                                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peso bruto**              | Gramos que marca la balanza, sin aplicar la ley. **Todo el oro se mide en gramos.**                                                                                                                                                                                                                                   |
| **Ley**                     | Pureza de la pieza. El sistema la guarda **siempre en milésimas (‰)**, de 0 a 1000. En los registros aparece en tres escalas: fracción (`0.875`), porcentaje (`94.5`) y milésimas (`920.5`). Se normaliza por magnitud.                                                                                               |
| **Peso fino** (o "puro")    | El oro real de la pieza: `bruto × ley / 1000` ✓                                                                                                                                                                                                                                                                       |
| **P. INT**                  | Precio internacional del oro, en USD por onza troy                                                                                                                                                                                                                                                                    |
| **Cierre**                  | Fija cuántos gramos finos vale un monto, a un porcentaje del P. INT                                                                                                                                                                                                                                                   |
| **Consignado / depósito**   | Dinero entregado al cliente (o recibido del proveedor)                                                                                                                                                                                                                                                                |
| **Gramos cerrados**         | Gramos finos que una parte queda debiendo o que se le deben por un cierre                                                                                                                                                                                                                                             |
| **Entrega**                 | Gramos finos entregados (los del packing list) que descuentan la deuda                                                                                                                                                                                                                                                |
| **Saldo en gramos**         | `Σ cerrado − Σ entregado`. Positivo: la parte debe oro. Negativo: se le debe dinero                                                                                                                                                                                                                                   |
| **Packing list**            | Lista de piezas que entrega un cliente (número, bruto, ley, fino) con sus totales                                                                                                                                                                                                                                     |
| **Exportación / envío**     | Salida de oro que agrupa packing lists de uno o varios clientes                                                                                                                                                                                                                                                       |
| **Comparativo**             | Por cada packing list: original del cliente (su ley, normalmente de pistola) vs **análisis** de Caracas o de la refinería. El peso no cambia, cambia la ley. `diferencia = fino del análisis − fino original`. Negativo: se le cobra al cliente; positivo: se le acredita. El % se expresa sobre el fino del análisis |
| **CVM y exportación**       | Deducciones obligatorias de toda exportación: **1 % de CVM y 0.3 % de exportación sobre el peso fino**. Las paga la empresa                                                                                                                                                                                           |
| **Utilidad de exportación** | % negociado en cada trato (p. ej. 1.5 %, 2 %, 2.5 %) sobre el fino, **menos** las deducciones                                                                                                                                                                                                                         |
| **Material de terceros**    | Piezas que llevan token y guardia/custodio: son material de los compradores árabes, con una negociación aparte. Se liquida por **utilidad** (gramos finos netos) o por **cobro total** (dinero: todo el costo de la operación, es decir piezas, envío, custodios, etc.)                                               |
| **Viruta / fundición**      | Material que sale de las **mismas piezas** (corte, muestra, fundición). **No es una pieza nueva**: un packing list de 10 piezas sigue teniendo 10. Se registra como consideración del packing list (o del envío), indicando de qué piezas proviene, y no suma a los totales                                           |
| **Resguardo**               | Material en custodia en Caracas, todavía no exportado                                                                                                                                                                                                                                                                 |
| **Token / lote**            | Código que agrupa piezas de un mismo origen (aparece en las exportaciones a compradores árabes)                                                                                                                                                                                                                       |
| **Comisión de envío**       | Cargo en gramos que se descuenta al liquidar un envío con el proveedor                                                                                                                                                                                                                                                |

## 4. Fórmulas

```
peso fino           = peso bruto × ley(‰) / 1000                  ej. 500 g × 920 ‰ = 460 g
precio por gramo    = P. INT / 31.1035 (onza troy del negocio)    ej. 4000 USD/oz → 128.6029 USD/g
precio negociado    = precio por gramo × porcentaje / 100         ej. × 95 % → 122.1727 USD/g
gramos cerrados     = monto / precio negociado                    ej. 100 000 USDT → 818.5132 g
margen (gramos)     = gramos cerrados al % del cliente − gramos cerrados al % del proveedor
saldo (gramos)      = Σ gramos cerrados − Σ gramos entregados
comparativo         = fino del análisis − fino original (por pieza; total por packing list)
comparativo %       = comparativo / fino del análisis × 100            ej. −7 g / 3193 g = −0.22 %
utilidad exportación= fino × (% negociado − 1 % CVM − 0.3 % exportación) ej. 10 000 g al 2 % → 70 g netos
reparto en bloque   = fino refinería total × (fino original del cliente / fino original total)
```

Implementación (dominio puro, cobertura del 100 %):

| Regla                         | Código                                                                             |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Ley, peso, dinero             | `apps/backend/src/domain/shared/{fineness,gold-weight,money}.vo.ts`                |
| Pieza y packing list          | `apps/backend/src/domain/sourcing/{gold-piece.vo,packing-list.entity}.ts`          |
| Cierre y margen               | `apps/backend/src/domain/arbitrage/{price-closure.vo,operation-spread.service}.ts` |
| Conciliación con la refinería | `apps/backend/src/domain/exports/refinery-reconciliation.service.ts`               |

## 5. Flujo principal (secuencial, como una orden P2P)

```
 1. Fondeo        El proveedor deposita USDT ────────────────────────────── cuenta del proveedor (+ dinero)
 2. Operación     Cierre: P. INT + % del cliente + % del proveedor ─────── cliente debe X g · se le deben Y g al proveedor
 3. Consignación  Se le entregan los USDT al cliente ───────────────────── cuenta del cliente (dinero)
 4. Compra        El cliente compra el oro y arma su packing list ──────── piezas: bruto, ley (pistola), fino
 5. Recepción     Caracas recibe y verifica la pureza ──────────────────── comparativo cliente vs Caracas (cobra/acredita)
 6. Entrega       El fino del packing list descuenta la deuda del cliente ─ saldo en gramos del cliente
 7. Exportación   Se consolidan packing lists (uno o varios clientes) ──── documentación legal + guías
 8. Envío         Sale el material hacia el comprador o la refinería
 9. Refinería     Análisis final por pieza (o fundición en bloque) ──────── diferencia por cliente (merma/crédito)
10. Liquidación   Se descuenta lo entregado al proveedor, más la comisión de envío y la diferencia ─ saldo del proveedor
```

## 6. Modelo de datos propuesto (fase 1)

```
suppliers ──< operations >── clients
                 │ (cierre: monto, P. INT, % cliente, % proveedor)
clients ──< packing_lists ──< packing_list_pieces (número, bruto, ley ‰, fino)
suppliers ──< exports ──< packing_lists   (una exportación va a UN proveedor y agrupa 1..N packing lists; un packing list no se divide)
packing_lists ──< assays            (análisis de Caracas o de la refinería, por pieza → comparativo)
exports ──< third_party_pieces       (material de terceros: token, custodio, pieza original; liquidación UTILIDAD | COBRO_TOTAL)
exports                              (% de utilidad negociado + deducciones CVM 1 % y exportación 0.3 %)
ledger_entries                       (doble entrada en gramos y en dinero, por cliente y por proveedor)
```

Estados:

- **Packing list:** `BORRADOR → RECIBIDO (en resguardo) → EN_EXPORTACION → EXPORTADO → CONCILIADO`
- **Exportación:** `PREPARACION → DOCUMENTACION → ENVIADA → CON_RESULTADO → LIQUIDADA`
- **Operación:** `ABIERTA (cerrada en precio, pendiente de entrega) → CUMPLIDA (saldo 0) | CANCELADA`

## 7. Respuestas del negocio (2026-11-16) y cómo quedan en el sistema

| #   | Pregunta                | Respuesta                                                                                                                                                                                                | En el sistema                                                                                                                  |
| --- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Onza troy               | Se usa **31.1035**                                                                                                                                                                                       | `TROY_OUNCE_IN_GRAMS = 31.1035` (decisión del negocio, no el valor físico 31.1034768)                                          |
| 2   | Ley de referencia       | La diferencia se le cobra al cliente **cuando llegan los resultados**, sean de Caracas o de la refinería                                                                                                 | `compareWithAssay` con fuente `CARACAS` o `REFINERY`; el resultado ajusta el saldo del cliente                                 |
| 3   | Escalas de la ley       | El negocio normaliza la ley a mano; los clientes la envían de distintas formas                                                                                                                           | El sistema normaliza solo (fracción, porcentaje o milésimas) y la guarda en ‰                                                  |
| 4   | Compradores árabes      | La utilidad depende del trato (p. ej. 1.5 %, 2 %, 2.5 %) y **siempre** se le restan 1 % de CVM y 0.3 % de exportación                                                                                    | `computeExportProfit`: % negociado − deducciones; las deducciones son configurables por trato                                  |
| 5   | Comisión                | La CVM la paga la empresa; sale del peso fino. 1 % CVM + 0.3 % exportación                                                                                                                               | Son deducciones de la exportación (costo de la empresa), no se reparten entre clientes                                         |
| 6   | Exportaciones divididas | Si el material se reparte entre dos proveedores, **cada uno es un packing list distinto**, y a cada proveedor se le paga lo suyo                                                                         | Una exportación va a **un solo** proveedor; un packing list nunca se divide                                                    |
| 7   | Piezas especiales       | Cada cliente tiene su packing de entrega; las novedades se informan con el comparativo. La **viruta y la fundición no son piezas nuevas**: salen de las mismas piezas del packing                        | `MaterialResidue` (viruta/fundición) adjunto al packing list, con las piezas de origen; **no** suma al conteo ni a los totales |
| 8   | Precisión               | Venezuela registra 2 decimales; árabes y turcos reportan de 1 a 3                                                                                                                                        | Las medidas (peso bruto, ley en ‰) admiten **hasta 3 decimales**; los cálculos no se truncan y se muestran con 2               |
| 9   | Token / custodio        | Material de los árabes, con negociación aparte: en el balance entra la utilidad del envío o el **cobro total**, que es **dinero**: todo el costo de la operación (piezas, envío, pago a custodios, etc.) | `settleThirdPartyExport`: estrategia `UTILIDAD` (gramos finos netos) o `COBRO_TOTAL` (suma de costos en dinero, por concepto)  |

### Aclaraciones posteriores (2026-11-17)

- **Viruta y fundición:** no son piezas; son una consideración sobre piezas existentes del packing list o del envío.
- **Cobro total:** es en dinero y abarca todo el costo de la operación (piezas, envío, custodios y otros gastos).

## 8. Fuera del alcance de la fase 1

Gastos en efectivo y viáticos, préstamos al personal, conversión de divisas con tasas diarias,
inventario oficial ante los entes reguladores, compras y ventas de joyería, KYC y documentos
(módulo `compliance`) y el tablero de control. Se planifican después de validar la columna vertebral.
