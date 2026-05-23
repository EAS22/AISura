import {
  TextField as AriaTextField,
  Label,
  Input,
  Text,
  type TextFieldProps as AriaTextFieldProps,
} from 'react-aria-components';

interface TextFieldProps extends Omit<AriaTextFieldProps, 'onChange'> {
  label?: string;
  description?: string;
  errorMessage?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function TextField({ label, description, errorMessage, placeholder, type, value, onChange, className = '', ...props }: TextFieldProps) {
  return (
    <AriaTextField
      className={`flex flex-col gap-1 ${className}`}
      value={value}
      onChange={onChange}
      {...props}
    >
      {label && <Label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</Label>}
      <Input
        placeholder={placeholder}
        type={type}
        className="px-2.5 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md
          text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]
          transition-colors"
      />
      {description && <Text slot="description" className="text-xs text-[var(--color-text-tertiary)]">{description}</Text>}
      {errorMessage && <Text slot="errorMessage" className="text-xs text-red-500">{errorMessage}</Text>}
    </AriaTextField>
  );
}
