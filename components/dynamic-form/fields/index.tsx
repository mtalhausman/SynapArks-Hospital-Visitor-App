"use client";

import React from "react";
import { FieldType } from "@/lib/types/form-schema";
import { FieldProps } from "./types";
import { ShortTextField } from "./ShortTextField";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { DateField } from "./DateField";
import { RadioField } from "./RadioField";
import { HeadingField } from "./HeadingField";

export const UnsupportedField: React.FC<FieldProps> = ({ field }) => {
  return (
    <div className="p-3 bg-amber-50 border border-dashed border-amber-300 rounded-lg text-xs text-amber-800 flex items-center justify-between">
      <span>
        Unsupported field type: <strong className="font-mono">{field.type}</strong> ({field.label})
      </span>
      <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold uppercase">
        Schema Warning
      </span>
    </div>
  );
};

export const FIELD_RENDERERS: Record<FieldType, React.ComponentType<FieldProps>> = {
  shortText: ShortTextField,
  number: NumberField,
  select: SelectField,
  date: DateField,
  radio: RadioField,
  heading: HeadingField,
};

export * from "./types";
export * from "./ShortTextField";
export * from "./NumberField";
export * from "./SelectField";
export * from "./DateField";
export * from "./RadioField";
export * from "./HeadingField";
