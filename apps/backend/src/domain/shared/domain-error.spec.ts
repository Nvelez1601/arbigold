import { describe, expect, it } from 'vitest';
import { BusinessRuleError, DomainError, ValidationError } from './domain-error.ts';

describe('errores de dominio', () => {
  it('un error de validación lleva código, categoría y detalles para traducirlo sin if', () => {
    const error = new ValidationError('FINENESS_OUT_OF_RANGE', 'Ley fuera de rango', {
      value: 1200,
    });
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(error.category).toBe('VALIDATION');
    expect(error.code).toBe('FINENESS_OUT_OF_RANGE');
    expect(error.details).toEqual({ value: 1200 });
    expect(error.name).toBe('ValidationError');
  });

  it('una regla de negocio violada se distingue de un dato inválido', () => {
    const error = new BusinessRuleError('PIECE_NUMBER_DUPLICATED', 'Pieza repetida');
    expect(error.category).toBe('BUSINESS_RULE');
    expect(error.details).toBeUndefined();
  });
});
