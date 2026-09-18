import { FormField } from "@/lib/types/form-schema";

export interface FieldProps {
  field: FormField;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
  error?: string;
  disabled?: boolean;
}
