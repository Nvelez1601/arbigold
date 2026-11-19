import { describe, expect, it } from 'vitest';
import { mountWithApp } from '../../../../test/support/mount.ts';
import PanelChart from './PanelChart.vue';

describe('gráfico del panel', () => {
  it('sin puntos explica que aún no hay operaciones', async () => {
    const { wrapper } = await mountWithApp(PanelChart, { props: { points: [] } });
    expect(wrapper.text()).toContain('Aún no hay operaciones para graficar.');
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('dibuja dos barras por operación y rotula los días', async () => {
    const { wrapper } = await mountWithApp(PanelChart, {
      props: {
        points: [
          { label: '10/11', client: 120, supplier: 100 },
          { label: '11/11', client: 80, supplier: 60 },
        ],
      },
    });
    expect(wrapper.findAll('rect')).toHaveLength(4);
    expect(wrapper.findAll('text').map((text) => text.text())).toContain('10/11');
    expect(wrapper.findAll('text').map((text) => text.text())).toContain('11/11');
    expect(wrapper.find('svg').attributes('aria-label')).toContain('Gramos');
  });

  it('pone la barra del cliente a la izquierda de la del proveedor', async () => {
    const { wrapper } = await mountWithApp(PanelChart, {
      props: { points: [{ label: '12/11', client: 50, supplier: 70 }] },
    });
    const [client, supplier] = wrapper.findAll('rect');
    expect(Number(client?.attributes('x'))).toBeLessThan(Number(supplier?.attributes('x')));
    expect(Number(client?.attributes('width'))).toBe(14);
  });

  it('con un solo punto usa todo el ancho disponible sin dividir entre cero', async () => {
    const { wrapper } = await mountWithApp(PanelChart, {
      props: { points: [{ label: '13/11', client: 0, supplier: 90 }] },
    });
    expect(wrapper.findAll('rect')).toHaveLength(2);
  });
});
