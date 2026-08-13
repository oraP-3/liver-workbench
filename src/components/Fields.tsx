import { useId, type ReactNode } from "react";

export function Field({
  label,
  value,
  onChange,
  type = "number",
  step = "any",
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string | number | null;
  onChange: (value: string) => void;
  type?: "number" | "text" | "date";
  step?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type={type}
        step={type === "number" ? step : undefined}
        value={value ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export const TriOptions = () => (
  <>
    <option value="unknown">未入力・不明</option>
    <option value="yes">あり・済み</option>
    <option value="no">なし・未実施</option>
  </>
);
