import { describe, expect, it } from 'vitest';
import { ValidationError } from '../shared/domain-error.ts';
import { GoldWeight } from '../shared/gold-weight.vo.ts';
import { reconcileBlockMelt, reconcileByPiece } from './refinery-reconciliation.service.ts';

const g = (grams: string) => GoldWeight.ofGrams(grams);
let pieceNumber = 0;
const piece = (clientId: string, original: string, refinery: string) => ({
  clientId,
  number: ++pieceNumber,
  originalFine: g(original),
  refineryFine: g(refinery),
});

describe('reconcileByPiece (la refinería analiza pieza por pieza)', () => {
  const result = reconcileByPiece([
    piece('cliente-a', '500', '499.2'),
    piece('cliente-b', '300', '299.9'),
    piece('cliente-a', '200', '198.5'),
  ]);

  it('agrupa por cliente y calcula su merma (refinería − original)', () => {
    const clienteA = result.byClient.find((c) => c.clientId === 'cliente-a');
    expect(clienteA?.originalFine.grams.toString()).toBe('700');
    expect(clienteA?.refineryFine.grams.toString()).toBe('697.7');
    expect(clienteA?.difference.toString()).toBe('-2.3');
  });

  it('calcula la participación de cada cliente en el envío', () => {
    const shares = result.byClient.map((c) => c.share.toDecimalPlaces(4).toString());
    expect(shares).toEqual(['0.7', '0.3']);
  });

  it('el total del envío cuadra con la suma de los clientes', () => {
    expect(result.originalFine.grams.toString()).toBe('1000');
    // −2.3 (cliente A) − 0.1 (cliente B)
    expect(result.difference.toString()).toBe('-2.4');
  });

  it('una diferencia positiva es un crédito para el cliente', () => {
    const credit = reconcileByPiece([piece('cliente-c', '100', '100.25')]);
    expect(credit.byClient[0]?.difference.isPositive()).toBe(true);
  });
});

describe('reconcileBlockMelt (la refinería funde en bloque)', () => {
  it('reparte el fino de la refinería en proporción al fino original de cada cliente', () => {
    const result = reconcileBlockMelt(
      [
        { clientId: 'cliente-a', originalFine: g('750') },
        { clientId: 'cliente-b', originalFine: g('250') },
      ],
      g('990'),
    );
    expect(result.byClient.map((c) => c.refineryFine.grams.toString())).toEqual(['742.5', '247.5']);
    expect(result.byClient.map((c) => c.difference.toString())).toEqual(['-7.5', '-2.5']);
    expect(result.difference.toString()).toBe('-10');
  });

  it('un envío sin fino original no reparte nada ni divide por cero', () => {
    const result = reconcileBlockMelt([{ clientId: 'cliente-a', originalFine: g('0') }], g('0'));
    expect(result.byClient[0]?.share.isZero()).toBe(true);
    expect(result.byClient[0]?.refineryFine.grams.isZero()).toBe(true);
  });
});

describe('envío vacío', () => {
  it('no se puede conciliar un envío sin piezas', () => {
    expect(() => reconcileByPiece([])).toThrow(ValidationError);
    expect(() => reconcileBlockMelt([], g('10'))).toThrow(
      'Un envío sin piezas no se puede conciliar',
    );
  });
});
