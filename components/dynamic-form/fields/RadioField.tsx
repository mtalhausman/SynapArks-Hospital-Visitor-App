"use client";

import React from "react";
import { FieldProps } from "./types";

export const RadioField: React.FC<FieldProps> = ({
  field,
  value,
  onChange,
  error,
  disabled,
}) => {
  const isReadOnly = field.readOnly || disabled;
  const currentVal = value !== undefined && value !== null ? String(value) : "";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-700 tracking-wide flex items-center gap-1">
        <span>{field.label}</span>
        {field.required && <span className="text-red-500 text-sm">*</span>}
      </span>

      {isReadOnly ? (
        <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 font-medium select-text">
          {field.options?.find((o) => o.value === currentVal)?.label || currentVal || (
            <span className="text-gray-400 italic">None</span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {field.options?.map((opt) => {
            const isSelected = currentVal === opt.value;
            const isApprove = opt.value.toLowerCase() === "approve";
            const isReject = opt.value.toLowerCase() === "reject";

            let activeClasses = "border-indigo-600 bg-indigo-50/60 text-indigo-900 ring-2 ring-indigo-500/20";
            if (isApprove && isSelected) {
              activeClasses = "border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20";
            } else if (isReject && isSelected) {
              activeClasses = "border-red-600 bg-red-50 text-red-900 ring-2 ring-red-500/20";
            }

            return (
              <label
                key={opt.value}
                htmlFor={`${field.id}_${opt.value}`}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                  isSelected ? activeClasses : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <input
                  id={`${field.id}_${opt.value}`}
                  type="radio"
                  name={field.key}
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => onChange(field.key, opt.value)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
};
