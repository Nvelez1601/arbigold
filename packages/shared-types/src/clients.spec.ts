import { describe, expect, it } from 'vitest';
import { clientInputSchema, clientSchema } from './clients.ts';

describe('contrato de cliente', () => {
  it('acepta un cliente mínimo y omite los opcionales vacíos', () => {
    const parsed = clientInputSchema.parse({
      name: ' Cliente Ejemplo ',
      kind: 'PERSONA',
      phone: '',
    });
    expect(parsed).toEqual({ name: 'Cliente Ejemplo', kind: 'PERSONA' });
  });

  it('valida el % habitual de compra', () => {
    expect(
      clientInputSchema.safeParse({ name: 'Ab', kind: 'EMPRESA', defaultPercentage: '96,5' }).data
        ?.defaultPercentage,
    ).toBe('96.5');
    expect(
      clientInputSchema.safeParse({ name: 'Ab', kind: 'EMPRESA', defaultPercentage: '120' })
        .success,
    ).toBe(false);
  });

  it('exige un nombre de al menos 2 caracteres', () => {
    const result = clientInputSchema.safeParse({ name: 'A', kind: 'PERSONA' });
    expect(result.error?.issues[0]?.message).toBe('Escribe al menos 2 caracteres');
  });

  it('el registro guardado lleva id, estado y fecha de alta', () => {
    const record = {
      name: 'Ab',
      kind: 'PERSONA',
      id: 'c-1',
      active: true,
      createdAt: '2026-11-17T10:00:00Z',
    };
    expect(clientSchema.parse(record).id).toBe('c-1');
  });
});
