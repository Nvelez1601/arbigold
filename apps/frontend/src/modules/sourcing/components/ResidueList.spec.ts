import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { ResidueRow } from '../composables/usePackingListEditor.ts';
import ResidueList from './ResidueList.vue';

const residue = (overrides: Partial<ResidueRow> = {}): ResidueRow => ({
  key: 'r-1',
  kind: 'VIRUTA',
  fromPieces: [1, 2],
  grossWeight: '12.5',
  fineness: '920',
  note: 'Barrido del piso',
  ...overrides,
});

describe('ResidueList', () => {
  it('sin registros lo dice y recuerda que no suman a los totales', () => {
    const wrapper = mount(ResidueList, {
      props: { residues: [], readonly: true, orphanResidues: [] },
    });
    expect(wrapper.text()).toContain('Sin viruta ni fundición registradas.');
    expect(wrapper.text()).toContain('No suman al conteo ni a los totales');
  });

  it('describe la viruta con sus piezas, peso, ley y nota', () => {
    const wrapper = mount(ResidueList, {
      props: { residues: [residue()], readonly: true, orphanResidues: [] },
    });
    expect(wrapper.text()).toContain('Viruta de piezas 1 y 2');
    expect(wrapper.text()).toContain('12,50 g');
    expect(wrapper.text()).toContain('920,0 ‰');
    expect(wrapper.text()).toContain('Barrido del piso');
  });

  it('solo ofrece quitar cuando el packing list es editable, y emite la clave', async () => {
    const editable = mount(ResidueList, {
      props: { residues: [residue()], readonly: false, orphanResidues: [] },
    });
    const button = editable.get('button');
    expect(button.attributes('aria-label')).toBe('Quitar viruta de piezas 1 y 2');
    await button.trigger('click');
    expect(editable.emitted('remove')).toEqual([['r-1']]);

    const readonly = mount(ResidueList, {
      props: { residues: [residue()], readonly: true, orphanResidues: [] },
    });
    expect(readonly.find('button').exists()).toBe(false);
  });

  it('avisa cuando una pieza de origen ya no existe', () => {
    const orphan = residue();
    const wrapper = mount(ResidueList, {
      props: { residues: [orphan], readonly: true, orphanResidues: [orphan] },
    });
    expect(wrapper.text()).toContain('Alguna pieza de origen ya no existe');
  });
});
