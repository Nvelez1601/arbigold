import { describe, expect, it } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS } from './navigation.ts';

describe('navegación', () => {
  it('sigue el orden del flujo: proveedor → cliente → operación → packing list → exportación', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual([
      'Panel',
      'Proveedores',
      'Clientes',
      'Operaciones',
      'Packing lists',
      'Exportaciones',
    ]);
  });

  it('cada módulo tiene ruta, ícono, descripción y bloque', () => {
    expect(
      NAV_ITEMS.every((item) => item.to.startsWith('/') && item.icon && item.description),
    ).toBe(true);
    expect(
      NAV_ITEMS.every((item) => item.group === 'Operación' || item.group === 'Relaciones'),
    ).toBe(true);
  });

  it('agrupa la operación diaria y las relaciones, sin duplicar ni perder módulos', () => {
    expect(NAV_GROUPS.map((group) => group.label)).toEqual(['Operación', 'Relaciones']);
    expect(NAV_GROUPS.flatMap((group) => group.items)).toHaveLength(NAV_ITEMS.length);
    expect(NAV_GROUPS[0]?.items.map((item) => item.label)).toEqual([
      'Panel',
      'Operaciones',
      'Packing lists',
      'Exportaciones',
    ]);
    expect(NAV_GROUPS[1]?.items.map((item) => item.label)).toEqual(['Proveedores', 'Clientes']);
  });
});
