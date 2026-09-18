"use client";

import React from "react";
import { FieldProps } from "./types";

export const NumberField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const isReadOnly = field.readOnly || disabled;
  const stringVal = value !== undefined && value !== null ? String(value) : "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(field.key, "");
    } else {
      const num = Number(raw);
      onChange(field.key, isNaN(num) ? raw : num);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={field.id}
        className="text-xs font-semibold text-gray-700 tracking-wide flex items-center gap-1"
      >
        <span>{field.label}</span>
        {field.required && <span className="text-red-500 text-sm">*</span>}
      </label>

      {isReadOnly ? (
        <div
          id={field.id}
          className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-medium select-text"
        >
          {stringVal || <span className="text-gray-400 italic">None</span>}
        </div>
      ) : (
        <input
          id={field.id}
          name={field.key}
          type="number"
          value={stringVal}
          placeholder={`Enter ${field.label.toLowerCase()}`}
          onChange={handleChange}
          className={`w-full px-3.5 py-2.5 text-sm bg-white border rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-200 text-red-900"
              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-100 text-gray-900"
          }`}
        />
      )}

      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
};
