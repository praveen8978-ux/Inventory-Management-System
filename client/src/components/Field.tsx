import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };

export default function Field({ label, error, hint, id, ...input }: Props) {
  const inputId = id ?? input.name;
  const describedBy = [error ? `${inputId}-error` : "", hint ? `${inputId}-hint` : ""].filter(Boolean).join(" ");
  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 ${
          error ? "border-red-500" : "border-stone-300"
        }`}
        {...input}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="mt-1 text-xs text-stone-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}