import { useId, type ReactNode } from "react";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  // Small extra label inside the chip, e.g. "Vorschlag".
  tag?: string;
};

type ChipGroupBase<T extends string> = {
  legend: ReactNode;
  options: readonly ChipOption<T>[];
  error?: string | undefined;
};

type SingleChipGroupProps<T extends string> = ChipGroupBase<T> & {
  value: T | "";
  onChange: (value: T) => void;
};

type MultiChipGroupProps<T extends string> = ChipGroupBase<T> & {
  value: readonly T[];
  onChange: (value: T[]) => void;
};

// Native radio buttons and checkboxes styled as chips, so keyboard and screen
// reader behaviour come for free.
function ChipFieldset<T extends string>({
  legend,
  options,
  error,
  type,
  isChecked,
  onToggle,
}: ChipGroupBase<T> & {
  type: "radio" | "checkbox";
  isChecked: (value: T) => boolean;
  onToggle: (value: T) => void;
}) {
  const name = useId();
  const errorId = `${name}-error`;

  return (
    <fieldset className="chip-fieldset" aria-describedby={error ? errorId : undefined}>
      <legend className="field-legend">{legend}</legend>
      <div className="chip-group">
        {options.map((option) => (
          <label key={option.value} className="chip">
            <input
              type={type}
              name={name}
              value={option.value}
              checked={isChecked(option.value)}
              onChange={() => onToggle(option.value)}
              className="sr-only"
            />
            <span>{option.label}</span>
            {option.tag !== undefined && <span className="chip-tag">{option.tag}</span>}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export function SingleChipGroup<T extends string>({
  value,
  onChange,
  ...props
}: SingleChipGroupProps<T>) {
  return (
    <ChipFieldset
      {...props}
      type="radio"
      isChecked={(option) => option === value}
      onToggle={onChange}
    />
  );
}

export function MultiChipGroup<T extends string>({
  value,
  onChange,
  ...props
}: MultiChipGroupProps<T>) {
  return (
    <ChipFieldset
      {...props}
      type="checkbox"
      isChecked={(option) => value.includes(option)}
      onToggle={(option) =>
        onChange(
          value.includes(option) ? value.filter((entry) => entry !== option) : [...value, option],
        )
      }
    />
  );
}
