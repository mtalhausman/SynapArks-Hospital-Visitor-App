"use client";

import React, { useState, useEffect } from "react";
import { UiSchema, FormField } from "@/lib/types/form-schema";
import { FIELD_RENDERERS, UnsupportedField } from "./fields";
import { Loader2 } from "lucide-react";

export interface DynamicFormProps {
  schema: UiSchema;
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  initialValues = {},
  submitLabel,
  onSubmit,
  isSubmitting = false,
  disabled = false,
}) => {
  // Initialize form values from initialValues
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...initialValues,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Synchronize initialValues if props change (serialized to prevent reference loops)
  const initialValuesSerialized = JSON.stringify(initialValues || {});
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setValues((prev) => ({
        ...prev,
        ...initialValues,
      }));
    }
  }, [initialValuesSerialized]);

  const handleFieldChange = (key: string, value: unknown) => {
    setValues((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Clear error on change if present
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of schema.fields) {
      // Headings don't have values or validation
      if (field.type === "heading") continue;

      // Only validate editable fields that are marked required
      if (field.required && !field.readOnly) {
        const val = values[field.key];
        if (val === undefined || val === null || val === "") {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || disabled) return;

    if (!validate()) {
      return;
    }

    // Build submission payload: omit heading and readOnly fields (Section 5.2)
    const payload: Record<string, unknown> = {};
    for (const field of schema.fields) {
      if (field.type === "heading" || field.readOnly) continue;
      if (values[field.key] !== undefined) {
        payload[field.key] = values[field.key];
      }
    }

    await onSubmit(payload);
  };

  const isTwoColumn = schema.layout === "two-column";
  const effectiveSubmitLabel = submitLabel || schema.submitLabel || "Submit";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div
        className={
          isTwoColumn
            ? "grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4 items-start"
            : "flex flex-col gap-4"
        }
      >
        {schema.fields.map((field: FormField) => {
          const Renderer = FIELD_RENDERERS[field.type] || UnsupportedField;
          
          // Width calculation: in two-column, "half" takes 1 col, "full" or heading spans 2 cols
          let spanClass = "col-span-1";
          if (isTwoColumn) {
            if (field.type === "heading" || field.width === "full" || !field.width) {
              spanClass = "col-span-1 md:col-span-2";
            } else if (field.width === "half") {
              spanClass = "col-span-1";
            }
          }

          return (
            <div key={field.id || field.key} className={spanClass}>
              <Renderer
                field={field}
                value={values[field.key]}
                onChange={handleFieldChange}
                error={errors[field.key]}
                disabled={disabled || isSubmitting}
              />
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
        <button
          type="submit"
          id="dynamic-form-submit-button"
          disabled={disabled || isSubmitting}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin text-white" />}
          <span>{effectiveSubmitLabel}</span>
        </button>
      </div>
    </form>
  );
};
