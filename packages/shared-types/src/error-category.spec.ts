import { describe, expect, it } from 'vitest';
import { apiErrorResponseSchema, errorCategorySchema } from './error-category.ts';

describe('errorCategorySchema', () => {
  it('acepta una categoría conocida', () => {
    expect(errorCategorySchema.parse('BUSINESS_RULE')).toBe('BUSINESS_RULE');
  });

  it('rechaza una categoría que no existe en el contrato', () => {
    expect(errorCategorySchema.safeParse('TEAPOT').success).toBe(false);
  });
});

describe('apiErrorResponseSchema', () => {
  it('acepta la respuesta de error canónica de la API', () => {
    const response = {
      error: {
        code: 'SUPPLIER_INSUFFICIENT_FUNDS',
        message: 'Saldo insuficiente',
        requestId: 'req-1',
      },
    };
    expect(apiErrorResponseSchema.parse(response)).toEqual(response);
  });

  it('rechaza una respuesta sin requestId (no sería trazable)', () => {
    const response = { error: { code: 'X', message: 'Algo falló' } };
    expect(apiErrorResponseSchema.safeParse(response).success).toBe(false);
  });
});
