import { afterEach, describe, expect, it } from 'vitest';
import { focusFirstError } from './focusField.ts';

const IDS = { supplierId: 'suplier-input', clientId: 'client-input' };

const mountDocument = () => {
  document.body.innerHTML = `
    <input id="suplier-input" />
    <input id="client-input" />
    <button id="other">Otro</button>
  `;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('focusFirstError', () => {
  it('enfoca el elemento que corresponde al primer campo con error', () => {
    mountDocument();
    focusFirstError(IDS, 'clientId');
    expect(document.activeElement?.id).toBe('client-input');
  });

  it('cae al primer elemento focuseable si el campo no tiene id registrado', () => {
    mountDocument();
    focusFirstError(IDS, undefined);
    expect(document.activeElement?.id).toBe('suplier-input');
  });

  it('cae al primer focuseable si el campo registrado no está en el documento', () => {
    mountDocument();
    focusFirstError({ supplierId: 'desaparecido' }, 'supplierId');
    expect(document.activeElement?.id).toBe('suplier-input');
  });

  it('con el campo en null también enfoca el primero de la pantalla', () => {
    mountDocument();
    focusFirstError(IDS, null);
    expect(document.activeElement?.id).toBe('suplier-input');
  });

  it('sin ningún elemento focuseable no rompe', () => {
    document.body.innerHTML = '<p>Vacío</p>';
    expect(() => focusFirstError(IDS, 'clientId')).not.toThrow();
  });
});
