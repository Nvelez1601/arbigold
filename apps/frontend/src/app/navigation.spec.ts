import { describe, expect, it } from 'vitest';
import { NAV_ITEMS } from './navigation.ts';

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

  it('cada módulo tiene ruta, ícono y descripción', () => {
    expect(
      NAV_ITEMS.every((item) => item.to.startsWith('/') && item.icon && item.description),
    ).toBe(true);
  });
});
