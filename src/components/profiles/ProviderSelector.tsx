import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { PROVIDER_CONFIGS, type GitProvider } from '@/lib/providerUtils';

interface ProviderSelectorProps {
  value: GitProvider;
  onChange: (value: GitProvider) => void;
  disabled?: boolean;
}

const PROVIDER_ORDER: GitProvider[] = ['github', 'gitlab', 'bitbucket', 'azure', 'other'];

export function ProviderSelector({ value, onChange, disabled }: ProviderSelectorProps) {
  const selected = PROVIDER_CONFIGS[value];

  return (
    <Select.Root value={value} onValueChange={(v) => onChange(v as GitProvider)} disabled={disabled}>
      <Select.Trigger
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-background border border-border rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"
        aria-label="Select Git Provider"
      >
        <Select.Value asChild>
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            {selected.name}
          </span>
        </Select.Value>
        <Select.Icon>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          className="z-50 min-w-[200px] bg-background border border-border rounded-md shadow-lg overflow-hidden"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1">
            {PROVIDER_ORDER.map((id) => {
              const cfg = PROVIDER_CONFIGS[id];
              return (
                <Select.Item
                  key={id}
                  value={id}
                  className="relative flex items-center gap-2 px-3 py-2 text-sm rounded cursor-pointer outline-none select-none data-[highlighted]:bg-muted data-[disabled]:opacity-50 data-[disabled]:pointer-events-none"
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.color }}
                  />
                  <Select.ItemText>{cfg.name}</Select.ItemText>
                  <Select.ItemIndicator className="ml-auto">
                    <Check className="w-3.5 h-3.5 text-primary" />
                  </Select.ItemIndicator>
                </Select.Item>
              );
            })}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
