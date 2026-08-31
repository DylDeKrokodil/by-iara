import { MediaUsageType } from './media.models';

export function formatMediaBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function mediaUsageLabel(types: MediaUsageType[]): string {
  const labels: Record<MediaUsageType, string> = {
    SERVICE: 'Services',
    GUIDE_IMAGE: 'Guide covers',
    GUIDE_CONTENT: 'Guide content',
  };
  return types.map((type) => labels[type]).join(', ') || 'Not used yet';
}
