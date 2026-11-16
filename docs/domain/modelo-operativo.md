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

| Concepto                     | Definición                                                                                                                                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Peso bruto**               | Gramos que marca la balanza, sin aplicar la ley. **Todo el oro se mide en gramos.**                                                                                                                                     |
| **Ley**                      | Pureza de la pieza. El sistema la guarda **siempre en milésimas (‰)**, de 0 a 1000. En los registros aparece en tres escalas: fracción (`0.875`), porcentaje (`94.5`) y milésimas (`920.5`). Se normaliza por magnitud. |
| **Peso fino** (o "puro")     | El oro real de la pieza: `bruto × ley / 1000` ✓                                                                                                                                                                         |
| **P. INT**                   | Precio internacional del oro, en USD por onza troy                                                                                                                                                                      |
| **Cierre**                   | Fija cuántos gramos finos vale un monto, a un porcentaje del P. INT                                                                                                                                                     |
| **Consignado / depósito**    | Dinero entregado al cliente (o recibido del proveedor)                                                                                                                                                                  |
| **Gramos cerrados**          | Gramos finos que una parte queda debiendo o que se le deben por un cierre                                                                                                                                               |
| **Entrega**                  | Gramos finos entregados (los del packing list) que descuentan la deuda                                                                                                                                                  |
| **Saldo en gramos**          | `Σ cerrado − Σ entregado`. Positivo: la parte debe oro. Negativo: se le debe dinero                                                                                                                                     |
| **Packing list**             | Lista de piezas que entrega un cliente (número, bruto, ley, fino) con sus totales                                                                                                                                       |
| **Exportación / envío**      | Salida de oro que agrupa packing lists de uno o varios clientes                                                                                                                                                         |
| **Comparativo / diferencia** | `fino de la refinería − fino original`. Negativo = merma (se le cobra al cliente); positivo = se le acredita                                                                                                            |
| **Resguardo**                | Material en custodia en Caracas, todavía no exportado                                                                                                                                                                   |
| **Token / lote**             | Código que agrupa piezas de un mismo origen (aparece en las exportaciones a compradores árabes)                                                                                                                         |
| **Comisión de envío**        | Cargo en gramos que se descuenta al liquidar un envío con el proveedor                                                                                                                                                  |

## 4. Fórmulas

```
peso fino           = peso bruto × ley(‰) / 1000                  ej. 500 g × 920 ‰ = 460 g
precio por gramo    = P. INT / 31.1034768                         ej. 4000 USD/oz → 128.6030 USD/g
precio negociado    = precio por gramo × porcentaje / 100         ej. × 95 % → 122.1728 USD/g
gramos cerrados     = monto / precio negociado                    ej. 100 000 USDT → 818.5125 g
margen (gramos)     = gramos cerrados al % del cliente − gramos cerrados al % del proveedor
saldo (gramos)      = Σ gramos cerrados − Σ gramos entregados
diferencia          = fino refinería − fino original (por pieza o por cliente)
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
exports ──< packing_lists          (una exportación agrupa 1..N packing lists; un packing list sale en UNA exportación)
exports ──< refinery_results        (por pieza, o un total si se fundió en bloque)
ledger_entries                       (doble entrada en gramos y en dinero, por cliente y por proveedor)
```

Estados:

- **Packing list:** `BORRADOR → RECIBIDO (en resguardo) → EN_EXPORTACION → EXPORTADO → CONCILIADO`
- **Exportación:** `PREPARACION → DOCUMENTACION → ENVIADA → CON_RESULTADO → LIQUIDADA`
- **Operación:** `ABIERTA (cerrada en precio, pendiente de entrega) → CUMPLIDA (saldo 0) | CANCELADA`

## 7. Preguntas abiertas para el negocio

1. **Onza troy:** los registros usan `31.1035`; el sistema usa el estándar `31.1034768`. Diferencia: 0.0076 g por cada 10 kg. ¿Se acepta el estándar o se replica `31.1035` para cuadrar con el histórico?
2. **Ley de referencia:** ¿qué ley descuenta la deuda del cliente: la de su análisis (pistola), la verificación de Caracas o la de la refinería? Hoy existen dos comparativos (cliente vs Caracas y original vs refinería).
3. **Escalas de la ley:** se interpretan por magnitud (≤ 1 fracción, ≤ 100 porcentaje, ≤ 1000 milésimas). ¿Existe alguna ley real por debajo de 100 ‰ que rompa esta regla?
4. **Compradores árabes:** ¿son proveedores (adelantan fondos) o compradores con otro esquema? Sus registros calculan "utilidades" como % sobre el fino exportado (1.5 %, 0.6 %, 1.6 %).
5. **Comisión de envío:** ¿es un % del fino o un monto fijo en gramos? ¿La paga el proveedor o se reparte entre clientes?
6. **Exportaciones divididas:** si una exportación se reparte entre dos compradores (p. ej. 50 kg y 50 kg), ¿un packing list puede partirse o siempre va completo a un solo comprador?
7. **Piezas especiales:** ¿cómo se registran la "viruta" y las "fundiciones" que aparecen en algunos envíos?
8. **Precisión:** ¿con cuántos decimales se registran los gramos y la ley? (Se ven hasta 2 decimales en el peso y 2 en la ley en milésimas.)
9. **Token / custodio / pieza original:** ¿son datos obligatorios de toda pieza o solo de las exportaciones a compradores árabes?

## 8. Fuera del alcance de la fase 1

Gastos en efectivo y viáticos, préstamos al personal, conversión de divisas con tasas diarias,
inventario oficial ante los entes reguladores, compras y ventas de joyería, KYC y documentos
(módulo `compliance`) y el tablero de control. Se planifican después de validar la columna vertebral.
