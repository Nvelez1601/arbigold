import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import type { Repository } from '../data/local-repository.ts';

/** Lista de una entidad con vue-query (carga, error y datos reactivos). */
export const useCollection = <TRecord extends { id: string }, TInput>(
  key: readonly string[],
  repository: Repository<TRecord, TInput>,
) => useQuery({ queryKey: key, queryFn: () => repository.list() });

/** Crear, actualizar o eliminar; al terminar invalida la lista para que todas las pantallas se refresquen. */
export const useCollectionMutations = <TRecord extends { id: string }, TInput>(
  key: readonly string[],
  repository: Repository<TRecord, TInput>,
) => {
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: key });
  return {
    create: useMutation({ mutationFn: (input: TInput) => repository.create(input), onSuccess }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<TRecord> }) =>
        repository.update(id, patch),
      onSuccess,
    }),
    remove: useMutation({ mutationFn: (id: string) => repository.remove(id), onSuccess }),
  };
};
