import { describe, expect, it, vi } from 'vitest';

const add = vi.fn();
vi.mock('primevue/usetoast', () => ({ useToast: () => ({ add }) }));

const { SUCCESS_TOAST_LIFE_MS, useNotify } = await import('./useNotify.ts');

describe('useNotify', () => {
  it('un aviso de éxito se cierra solo', () => {
    useNotify()('success', 'Proveedor guardado', 'Proveedor Ficticio');
    expect(add).toHaveBeenLastCalledWith({
      severity: 'success',
      summary: 'Proveedor guardado',
      detail: 'Proveedor Ficticio',
      life: SUCCESS_TOAST_LIFE_MS,
    });
  });

  it('un error se queda en pantalla hasta cerrarlo (pide una acción)', () => {
    useNotify()('error', 'No se pudo guardar', 'Vuelve a intentarlo.');
    expect(add).toHaveBeenLastCalledWith(
      expect.objectContaining({ severity: 'error', life: undefined }),
    );
  });
});
