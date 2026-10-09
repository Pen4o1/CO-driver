import { useLocalSearchParams, useRouter } from 'expo-router';

import { RouteEditForm } from '@/features/library/RouteEditModal';
import { leave } from '@/ui/navigation';

export default function EditRouteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routeId = typeof id === 'string' ? id : '';

  return (
    <RouteEditForm
      routeId={routeId}
      onClose={() => leave(router)}
      onDeleted={() => router.replace('/')}
      onDuplicated={(copyId) => router.replace(`/route/${copyId}`)}
      onChangeRoad={() => router.replace(`/route/new?editId=${routeId}`)}
    />
  );
}
