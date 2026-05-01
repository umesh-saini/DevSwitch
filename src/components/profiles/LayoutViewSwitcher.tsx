import { LayoutView, useSettingsStore } from '@/stores/settingsStore';
import { Grid3x3, List, LayoutGrid } from 'lucide-react';


export function LayoutViewSwitcher() {
  const { layoutView, setLayoutView } = useSettingsStore();

  const views: { value: LayoutView; icon: typeof Grid3x3; label: string }[] = [
    { value: 'grid', icon: Grid3x3, label: 'Grid' },
    { value: 'list', icon: List, label: 'List' },
    { value: 'compact', icon: LayoutGrid, label: 'Compact' },
  ];

  return (
    <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md">
      {views.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setLayoutView(value)}
          className={`h-8 px-3 flex items-center gap-2 rounded transition-colors ${
            layoutView === value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          aria-label={label}
        >
          <Icon className="w-4 h-4" />
          <span className="text-xs font-medium">{label}</span>
        </button>
      ))}
    </div>
  );
}
