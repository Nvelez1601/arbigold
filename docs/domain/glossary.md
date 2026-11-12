# Glosario de dominio (español ↔ código)

| Negocio (español)     | Código (inglés)      | Definición                                                       |
| --------------------- | -------------------- | ---------------------------------------------------------------- |
| Proveedor (de fondos) | `Supplier`           | Inversionista que aporta capital para comprar oro                |
| Cliente               | `Client`             | Contraparte que entrega oro físico a cambio de fondos asignados  |
| Operación             | `ArbitrageOperation` | Ciclo completo fondos → asignación → oro → liquidación           |
| Asignación de fondos  | `FundAllocation`     | Porción del capital de un proveedor comprometida con un cliente  |
| Lote de oro           | `GoldLot`            | Unidad física recibida, con peso, pureza y origen                |
| Lista de empaque      | `PackingList`        | Detalle de los lotes de un envío                                 |
| Pureza / ley          | `Purity` (fineness)  | Proporción de oro fino (p. ej. 0.999)                            |
| Peso                  | `GoldWeight`         | Gramos (`Decimal`); onza troy = 31.1034768 g                     |
| Tasa de cambio        | `ExchangeRate`       | Par de monedas + valor `Decimal` + fuente + fecha                |
| Dinero                | `Money`              | Monto `Decimal` + moneda ISO 4217                                |
| Liquidación           | `Settlement`         | Cierre de la operación: retorno al proveedor                     |
| Asiento contable      | `LedgerEntry`        | Movimiento de doble entrada, inmutable                           |
| Expediente KYC        | `KycDossier`         | Documentos de identidad y de origen de fondos de una contraparte |
| Bitácora de auditoría | `AuditLog`           | Registro append-only de acciones                                 |
