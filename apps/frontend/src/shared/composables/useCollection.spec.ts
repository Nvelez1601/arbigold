import { flushPromises } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import { z } from 'zod';
import { mountWithApp } from '../../../test/support/mount.ts';
import { createLocalRepository } from '../data/local-repository.ts';
import { useCollection, useCollectionMutations } from './useCollection.ts';

const schema = z.object({ id: z.string(), name: z.string(), createdAt: z.string() });
const memory = new Map<string, string>();
const repository = createLocalRepository<z.infer<typeof schema>, { name: string }>({
  key: 'items',
  schema,
  storage: { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) },
  build: (input, meta) => ({ ...input, ...meta }),
});

const Harness = defineComponent({
  setup(_props, { expose }) {
    const { data } = useCollection(['items'], repository);
    const mutations = useCollectionMutations(['items'], repository);
    expose({ mutations });
    return () =>
      h(
        'ul',
        (data.value ?? []).map((item) => h('li', item.name)),
      );
  },
});

type HarnessApi = {
  mutations: ReturnType<typeof useCollectionMutations<z.infer<typeof schema>, { name: string }>>;
};

describe('useCollection', () => {
  it('lista, crea, actualiza y elimina refrescando la lista', async () => {
    const { wrapper } = await mountWithApp(Harness);
    const vm = wrapper.vm as unknown as HarnessApi;
    expect(wrapper.findAll('li')).toHaveLength(0);

    const created = await vm.mutations.create.mutateAsync({ name: 'Uno' });
    await flushPromises();
    expect(wrapper.findAll('li').map((li) => li.text())).toEqual(['Uno']);

    await vm.mutations.update.mutateAsync({ id: created.id, patch: { name: 'Editado' } });
    await flushPromises();
    expect(wrapper.get('li').text()).toBe('Editado');

    await vm.mutations.remove.mutateAsync(created.id);
    await flushPromises();
    expect(wrapper.findAll('li')).toHaveLength(0);
  });
});
