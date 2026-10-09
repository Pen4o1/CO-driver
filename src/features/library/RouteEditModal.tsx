import { useRouter } from 'expo-router';
import { Modal } from 'react-native';

import { RouteEditForm } from './RouteEditForm';

type ModalProps = {
  routeId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
};

export function RouteEditModal({ routeId, onClose, onDeleted }: ModalProps) {
  const router = useRouter();

  return (
    <Modal
      visible={routeId != null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {routeId ? (
        <RouteEditForm
          key={routeId}
          routeId={routeId}
          onClose={onClose}
          onDeleted={onDeleted}
          onDuplicated={(copyId) => {
            onClose();
            router.push(`/route/${copyId}`);
          }}
          onChangeRoad={() => {
            const id = routeId;
            onClose();
            router.push(`/route/new?editId=${id}`);
          }}
        />
      ) : null}
    </Modal>
  );
}

export { RouteEditForm } from './RouteEditForm';
