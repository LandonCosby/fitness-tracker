import { Button } from '@/components/ui';
export default function HeaderAction({ label, onPress, disabled = false, variant = 'primary' }: { label: string; onPress: () => void; disabled?: boolean; variant?: 'primary' | 'success' }) {
  return <Button label={label} compact variant={variant} onPress={onPress} disabled={disabled} />;
}
