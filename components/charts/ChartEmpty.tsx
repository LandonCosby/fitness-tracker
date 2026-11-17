import { router } from 'expo-router';
import EmptyState from '@/components/EmptyState';

export default function ChartEmpty({ message, label }: { message: string; label: string }) {
  const weight = label.toLowerCase().includes('weight');
  const nutrition = /calories|protein/.test(label.toLowerCase());
  return <EmptyState compact icon={{ ios: 'chart.line.uptrend.xyaxis', material: 'show_chart' }}
    title={message} actionLabel={weight ? 'Log weight' : nutrition ? 'Log food' : 'Start a workout'}
    onAction={() => router.push(weight ? '/weigh-in' : nutrition ? '/food-add' : '/start-workout')} />;
}
