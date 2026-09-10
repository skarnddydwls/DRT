export interface FieldOption {
  label: string;
  value: string | number;
}

export type FieldType = "text" | "date" | "select" | "combobox";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  options?: FieldOption[];
  optionsEndpoint?: string;
  filterOptions?: (options: FieldOption[]) => FieldOption[];
  error?: string;
}


