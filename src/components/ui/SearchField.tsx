import {
  SearchField as AriaSearchField,
  Input,
  Button as AriaButton,
} from 'react-aria-components';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface SearchFieldProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchField({ placeholder = 'Cari...', value, onChange, className = '' }: SearchFieldProps) {
  return (
    <AriaSearchField
      value={value}
      onChange={onChange}
      className={`relative flex items-center ${className}`}
    >
      <MagnifyingGlassIcon className="absolute left-2 w-4 h-4 text-[var(--color-text-tertiary)] pointer-events-none" />
      <Input
        placeholder={placeholder}
        className="w-full pl-8 pr-8 py-1.5 text-sm bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-md
          text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]
          transition-colors"
      />
      <AriaButton className="absolute right-2 p-0.5 rounded hover:bg-[var(--color-border)]/50 transition-colors">
        <XMarkIcon className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
      </AriaButton>
    </AriaSearchField>
  );
}
