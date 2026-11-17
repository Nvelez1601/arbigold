import type { Client } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { matchesClientSearch, useClientForm } from './useClientForm.ts';

const existingClient: Client = {
  id: 'c-1',
  name: 'Compradora Ejemplo',
  kind: 'EMPRESA',
  documentId: 'J-00000000-1',
  defaultPercentage: '96.5',
  location: undefined,
  phone: undefined,
  notes: undefined,
  active: true,
  createdAt: '2026-11-01T10:00:00.000Z',
};

describe('formulario de cliente', () => {
  it('arranca vacío, como persona', () => {
    const form = useClientForm();
    expect(form.values).toMatchObject({ name: '', kind: 'PERSONA', defaultPercentage: '' });
    expect(form.errors.value).toEqual({});
  });

  it('al editar carga los datos del cliente y deja vacío lo que no tiene', () => {
    const form = useClientForm();
    form.reset(existingClient);
    expect(form.values).toMatchObject({
      name: 'Compradora Ejemplo',
      kind: 'EMPRESA',
      documentId: 'J-00000000-1',
      phone: '',
      defaultPercentage: '96.5',
    });
  });

  it('entrega los datos limpios cuando cumplen el contrato, con el % como texto', () => {
    const form = useClientForm();
    Object.assign(form.values, {
      name: '  Cliente Ejemplo ',
      phone: '',
      defaultPercentage: '96,5',
    });
    expect(form.validate()).toMatchObject({
      name: 'Cliente Ejemplo',
      kind: 'PERSONA',
      phone: undefined,
      defaultPercentage: '96.5',
    });
    expect(form.errors.value).toEqual({});
  });

  it('acepta un cliente sin % habitual', () => {
    const form = useClientForm();
    Object.assign(form.values, { name: 'Cliente Ejemplo', defaultPercentage: '  ' });
    expect(form.validate()?.defaultPercentage).toBeUndefined();
  });

  it('rechaza un nombre corto y un % fuera de rango, y dice cuál corregir primero', () => {
    const form = useClientForm();
    Object.assign(form.values, { name: 'A', defaultPercentage: '120' });
    expect(form.validate()).toBeNull();
    expect(form.errors.value).toEqual({
      name: 'Escribe al menos 2 caracteres',
      defaultPercentage: 'El porcentaje va entre 0 y 100',
    });
    expect(form.firstErrorField()).toBe('name');
  });

  it('muestra un solo error por campo', () => {
    const form = useClientForm();
    Object.assign(form.values, { name: 'Cliente Ejemplo', defaultPercentage: 'abc' });
    form.validate();
    expect(form.errors.value).toEqual({ defaultPercentage: 'Ingresa un número, p. ej. 1250.50' });
  });

  it('al reiniciar borra los errores anteriores', () => {
    const form = useClientForm();
    form.validate();
    form.reset();
    expect(form.errors.value).toEqual({});
    expect(form.firstErrorField()).toBeUndefined();
  });
});

describe('búsqueda de clientes', () => {
  it('encuentra por nombre sin importar acentos ni mayúsculas', () => {
    expect(matchesClientSearch(existingClient, ' compradora ')).toBe(true);
    expect(matchesClientSearch({ ...existingClient, name: 'José Gómez' }, 'jose gomez')).toBe(true);
  });

  it('encuentra por documento aunque se escriba sin guiones', () => {
    expect(matchesClientSearch(existingClient, '000000001')).toBe(true);
    expect(matchesClientSearch(existingClient, 'J-0000')).toBe(true);
  });

  it('no confunde a otro cliente ni falla si no tiene documento', () => {
    expect(matchesClientSearch(existingClient, 'Pérez')).toBe(false);
    expect(matchesClientSearch({ ...existingClient, documentId: undefined }, '123')).toBe(false);
  });

  it('una búsqueda vacía muestra a todos', () => {
    expect(matchesClientSearch(existingClient, '')).toBe(true);
  });
});
