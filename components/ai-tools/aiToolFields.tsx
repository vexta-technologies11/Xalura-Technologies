"use client";

type Opt = { value: string; label: string };

type SelectProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly Opt[] | ReadonlyArray<{ value: string; label: string }>;
};

export function AiToolSelect({ label, value, onChange, options }: SelectProps) {
  return (
    <label className="ai-tools__field">
      <span className="ai-tools__label">{label}</span>
      <select
        className="ai-tools__input ai-tools__select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type MainProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minRows?: number;
};

export function AiToolMainRequest({ label, value, onChange, placeholder, minRows = 6 }: MainProps) {
  return (
    <label className="ai-tools__field">
      <span className="ai-tools__label">{label}</span>
      <textarea
        className="ai-tools__input"
        rows={minRows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
      />
    </label>
  );
}
