import { useState, useCallback, useMemo } from 'react';
import { validateForm, validateField, ValidationSchema, Validator, ValidationResult } from '../lib/validation';

export interface UseFormValidationOptions<T extends Record<string, unknown>> {
  schema: ValidationSchema<T>;
  initialValues: T;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldTouched: (field: keyof T) => void;
  setValues: (values: Partial<T>) => void;
  validate: () => ValidationResult;
  validateField: (field: keyof T) => string | null;
  reset: (newValues?: T) => void;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
  };
  getFieldError: (field: keyof T) => string | undefined;
  isFieldValid: (field: keyof T) => boolean;
}

export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  initialValues,
  validateOnChange = true,
  validateOnBlur = true,
}: UseFormValidationOptions<T>): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Check if form has been modified
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  // Check if form is valid (no errors in touched fields)
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Set a single field value
  const setFieldValue = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setValuesState((prev) => ({ ...prev, [field]: value }));

      // Validate on change if enabled
      if (validateOnChange && touched[field as string]) {
        const fieldValidators = schema[field];
        if (fieldValidators) {
          const error = validateField(value, fieldValidators as Validator[]);
          setErrors((prev) => {
            if (error) {
              return { ...prev, [field]: error };
            }
            const newErrors = { ...prev };
            delete newErrors[field as string];
            return newErrors;
          });
        }
      }
    },
    [schema, validateOnChange, touched]
  );

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Mark a field as touched
  const setFieldTouched = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur if enabled
      if (validateOnBlur) {
        const fieldValidators = schema[field];
        if (fieldValidators) {
          const error = validateField(values[field], fieldValidators as Validator[], values as Record<string, unknown>);
          setErrors((prev) => {
            if (error) {
              return { ...prev, [field]: error };
            }
            const newErrors = { ...prev };
            delete newErrors[field as string];
            return newErrors;
          });
        }
      }
    },
    [schema, validateOnBlur, values]
  );

  // Validate entire form
  const validate = useCallback((): ValidationResult => {
    const result = validateForm(values, schema);
    setErrors(result.errors);

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    Object.keys(schema).forEach((key) => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    return result;
  }, [values, schema]);

  // Validate a single field
  const validateSingleField = useCallback(
    (field: keyof T): string | null => {
      const fieldValidators = schema[field];
      if (!fieldValidators) return null;

      const error = validateField(values[field], fieldValidators as Validator[], values as Record<string, unknown>);

      setErrors((prev) => {
        if (error) {
          return { ...prev, [field]: error };
        }
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });

      return error;
    },
    [schema, values]
  );

  // Reset form to initial values
  const reset = useCallback(
    (newValues?: T) => {
      setValuesState(newValues || initialValues);
      setErrors({});
      setTouched({});
    },
    [initialValues]
  );

  // Handle change event
  const handleChange = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target;
        let value: unknown;

        if (target.type === 'checkbox') {
          value = (target as HTMLInputElement).checked;
        } else if (target.type === 'number') {
          value = target.value === '' ? '' : Number(target.value);
        } else {
          value = target.value;
        }

        setFieldValue(field, value as T[keyof T]);
      },
    [setFieldValue]
  );

  // Handle blur event
  const handleBlur = useCallback(
    (field: keyof T) => () => {
      setFieldTouched(field);
    },
    [setFieldTouched]
  );

  // Get field props for easy binding
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
    }),
    [values, handleChange, handleBlur]
  );

  // Get field error (only if touched)
  const getFieldError = useCallback(
    (field: keyof T): string | undefined => {
      return touched[field as string] ? errors[field as string] : undefined;
    },
    [errors, touched]
  );

  // Check if field is valid
  const isFieldValid = useCallback(
    (field: keyof T): boolean => {
      return !errors[field as string];
    },
    [errors]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setFieldValue,
    setFieldTouched,
    setValues,
    validate,
    validateField: validateSingleField,
    reset,
    handleChange,
    handleBlur,
    getFieldProps,
    getFieldError,
    isFieldValid,
  };
}

export default useFormValidation;
