import type { RouteKey } from './routes';
import { TabAssistantPopup } from '../features/ai/TabAssistantPopup';

interface AppAssistantProps {
  open: boolean;
  route: RouteKey;
  title: string;
  onClose: () => void;
}

export function AppAssistant({ open, route, title, onClose }: AppAssistantProps) {
  return <TabAssistantPopup open={open} tabKey={route} tabTitle={title} onClose={onClose} />;
}
