import type { Supplier } from '@arbigold/shared-types';
import { describe, expect, it } from 'vitest';
import { SUPPLIER_KIND_OPTIONS, useSupplierForm } from './useSupplierForm.ts';

const existingSupplier: Supplier = {
  id: 's-1',
  name: 'Fondos Ejemplo',
  kind: 'TERCEROS',
  country: 'Panamá',
  currency: 'USD',
  defaultPercentage: '2.5',
  notes: 'Negocia por utilidad',
  active: true,
  createdAt: '2026-11-17T12:00:00.000Z',
};

describe('useSupplierForm', () => {
  it('un proveedor nuevo arranca como fondeo en USDT y sin % habitual', () => {
    const { values } = useSupplierForm();
    expect(values).toMatchObject({ kind: 'FONDEO', currency: 'USDT', defaultPercentage: '' });
  });

  it('al editar, precarga los datos del proveedor como texto', () => {
    const form = useSupplierForm();
    form.reset(existingSupplier);
    expect(form.values).toMatchObject({
      name: 'Fondos Ejemplo',
      kind: 'TERCEROS',
      country: 'Panamá',
      defaultPercentage: '2.5',
    });
  });

  it('al editar un proveedor sin datos opcionales deja esos campos en blanco', () => {
    const form = useSupplierForm();
    form.reset({
      ...existingSupplier,
      country: undefined,
      defaultPercentage: undefined,
      notes: undefined,
    });
    expect(form.values).toMatchObject({ country: '', defaultPercentage: '', notes: '' });
  });

  it('acepta el % con coma decimal y lo entrega normalizado como texto', () => {
    const form = useSupplierForm();
    Object.assign(form.values, { name: 'Fondos Ejemplo', defaultPercentage: '97,5' });
    const result = form.validate();
    expect(result).toEqual({
      isValid: true,
      input: expect.objectContaining({ name: 'Fondos Ejemplo', defaultPercentage: '97.5' }),
    });
  });

  it('un % habitual vacío no es un error: el proveedor queda sin %', () => {
    const form = useSupplierForm();
    form.values.name = 'Fondos Ejemplo';
    const result = form.validate();
    expect(result.isValid && result.input.defaultPercentage).toBeUndefined();
  });

  it('marca cada campo inválido y señala el primero en orden de pantalla', () => {
    const form = useSupplierForm();
    Object.assign(form.values, { name: 'A', defaultPercentage: '150' });
    expect(form.validate()).toEqual({ isValid: false, firstInvalidField: 'name' });
    expect(form.errors.value).toEqual({
      name: 'Escribe al menos 2 caracteres',
      defaultPercentage: 'El porcentaje va entre 0 y 100',
    });
  });

  it('limpia los errores al corregir o al reabrir el formulario', () => {
    const form = useSupplierForm();
    form.validate();
    expect(form.errors.value.name).toBeDefined();
    form.values.name = 'Fondos Ejemplo';
    form.validate();
    expect(form.errors.value).toEqual({});
    form.validate();
    form.reset();
    expect(form.errors.value).toEqual({});
  });

  it('sabe si el formulario cambió desde que se abrió', () => {
    const form = useSupplierForm();
    form.reset(existingSupplier);
    expect(form.isDirty.value).toBe(false);
    form.values.name = 'Otro nombre';
    expect(form.isDirty.value).toBe(true);
    form.reset();
    expect(form.isDirty.value).toBe(false);
  });

  it('explica qué significa cada tipo de proveedor', () => {
    expect(SUPPLIER_KIND_OPTIONS.map((option) => option.label)).toEqual(['Fondeo', 'Terceros']);
    expect(SUPPLIER_KIND_OPTIONS[0]?.description).toContain('recibe el oro exportado');
    expect(SUPPLIER_KIND_OPTIONS[1]?.description).toContain('token y custodio');
  });
});
