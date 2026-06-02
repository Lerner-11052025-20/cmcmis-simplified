import {
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  FileText,
  Wrench,
  Plus,
  HelpCircle,
  Box,
  Activity,
  ClipboardList,
  AlertTriangle,
  CalendarPlus,
  FilePlus,
  Package,
  Hourglass,
} from 'lucide-react';
import { StandardKpiCard } from '../../components/StandardKpiCard.jsx';

const ICONS = {
  clock: Clock,
  'alert-circle': AlertCircle,
  'check-circle': CheckCircle2,
  'trending-up': TrendingUp,
  'file-text': FileText,
  wrench: Wrench,
  plus: Plus,
  box: Box,
  activity: Activity,
  'clipboard-list': ClipboardList,
  'alert-triangle': AlertTriangle,
  'calendar-plus': CalendarPlus,
  'file-plus': FilePlus,
  package: Package,
  hourglass: Hourglass,
};

export function KpiCard({ card, loading = false }) {
  const Icon = (card && ICONS[card.icon]) || HelpCircle;
  const valueDisplay = card?.value_kind === 'percent' ? `${card.value}%` : String(card?.value ?? '');

  return (
    <StandardKpiCard
      to={card?.href || '#'}
      loading={loading}
      label={card?.label}
      value={valueDisplay}
      icon={Icon}
      accent={card?.accent}
      subtitle={card?.subtitle}
      ariaLabel={`${card?.label || 'KPI'}: ${valueDisplay}${card?.subtitle ? `. ${card.subtitle}` : ''}`}
    />
  );
}
