/**
 * Errores de dominio tipados (instructions/error-handling.md).
 * El dominio no conoce HTTP: declara una categoría y la infraestructura la traduce con un mapa.
 */
export type DomainErrorCategory = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE';

export type ErrorDetails = Readonly<Record<string, unknown>>;

export abstract class DomainError extends Error {
  abstract readonly category: DomainErrorCategory;
  readonly code: string;
  readonly details: ErrorDetails | undefined;

  constructor(code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.details = details;
  }
}

/** Un dato no cumple el formato o rango que exige el negocio (p. ej. una ley de 1200 ‰). */
export class ValidationError extends DomainError {
  readonly category = 'VALIDATION' as const;
}

/** El dato es válido, pero la operación viola una regla de negocio (p. ej. pieza repetida). */
export class BusinessRuleError extends DomainError {
  readonly category = 'BUSINESS_RULE' as const;
}
