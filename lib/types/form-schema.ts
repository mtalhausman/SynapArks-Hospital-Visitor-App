/**
 * Dynamic Form Schema Types
 * Based on SynapArk uiSchema specification
 */

export type FieldType =
  | "shortText"
  | "number"
  | "select"
  | "date"
  | "radio"
  | "heading";
  // Extensible as new types are observed from real API responses

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;            // stable uuid, not used for display
  key: string;           // variable name submitted to backend
  type: FieldType;
  label: string;
  required: boolean;
  readOnly: boolean;
  width?: "full" | "half"; // defaults to "full" if undefined
  options?: FormFieldOption[]; // present for select/radio
}

export interface UiSchema {
  version: number;
  layout: "two-column" | "single-column";
  submitLabel: string;
  fields: FormField[];
}

export interface FormDefinition {
  key: string;
  name: string;
  description?: string;
  category?: string;
  uiSchema: UiSchema;
}
