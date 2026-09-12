import { Store } from '@geajs/core';

export type GeaValidator<T> = (value: T, values: Record<string, unknown>) => string | null | Promise<string | null>;

export interface GeaFieldConfig<T = unknown> {
    initialValue: T;
    validators?: GeaValidator<T>[];
    validateOn?: 'change' | 'blur' | 'submit';
}

export interface GeaFormOptions {
    validateOnMount?: boolean;
}

interface InternalFieldState<T = unknown> {
    value: T;
    initialValue: T;
    error: string | null;
    touched: boolean;
    dirty: boolean;
    validators: GeaValidator<T>[];
    validateOn: 'change' | 'blur' | 'submit';
    validationToken: number;
}

export class GeaForm<TValues extends Record<string, unknown> = Record<string, unknown>> extends Store {
    values: TValues = {} as TValues;
    errors: Partial<Record<keyof TValues, string | null>> = {};
    touched: Partial<Record<keyof TValues, boolean>> = {};
    dirty: Partial<Record<keyof TValues, boolean>> = {};
    isValid = true;
    isSubmitting = false;
    isValidating = false;
    submitCount = 0;

    private fields = new Map<keyof TValues, InternalFieldState>();
    private options: Required<GeaFormOptions>;

    constructor(schema: { [K in keyof TValues]: GeaFieldConfig<TValues[K]> }, options: GeaFormOptions = {}) {
        super();

        this.options = {
            validateOnMount: options.validateOnMount ?? false
        };

        const initialValues = {} as TValues;
        const initialErrors: Partial<Record<keyof TValues, string | null>> = {};
        const initialTouched: Partial<Record<keyof TValues, boolean>> = {};
        const initialDirty: Partial<Record<keyof TValues, boolean>> = {};

        (Object.keys(schema) as (keyof TValues)[]).forEach((key) => {
            const config = schema[key];
            const state: InternalFieldState<TValues[typeof key]> = {
                value: config.initialValue,
                initialValue: config.initialValue,
                error: null,
                touched: false,
                dirty: false,
                validators: config.validators ?? [],
                validateOn: config.validateOn ?? 'change',
                validationToken: 0
            };
            this.fields.set(key, state as InternalFieldState);
            initialValues[key] = config.initialValue;
            initialErrors[key] = null;
            initialTouched[key] = false;
            initialDirty[key] = false;
        });

        this.values = initialValues;
        this.errors = initialErrors;
        this.touched = initialTouched;
        this.dirty = initialDirty;

        if (this.options.validateOnMount) {
            void this.validateAll();
        }
    }

    input<K extends keyof TValues>(name: K, valueOrEvent: TValues[K] | Event): void {
        const val = (valueOrEvent && typeof valueOrEvent === 'object' && 'target' in valueOrEvent)
            ? (valueOrEvent.target as HTMLInputElement).value as TValues[K]
            : valueOrEvent as TValues[K];

        this.setValue(name, val);
    }

    blur<K extends keyof TValues>(name: K): void {
        this.setTouched(name, true);
    }

    setValue<K extends keyof TValues>(name: K, value: TValues[K], shouldValidate = true): void {
        const field = this.requireField(name);
        field.value = value;
        field.dirty = value !== field.initialValue;

        this.values = { ...this.values, [name]: value };
        this.dirty = { ...this.dirty, [name]: field.dirty };

        if (shouldValidate && field.validateOn === 'change') {
            void this.validateField(name);
        }
    }

    setValues(patch: Partial<TValues>, shouldValidate = true): void {
        (Object.keys(patch) as (keyof TValues)[]).forEach((key) => {
            this.setValue(key, patch[key] as TValues[typeof key], false);
        });
        if (shouldValidate) {
            void this.validateAll();
        }
    }

    setTouched<K extends keyof TValues>(name: K, isTouched = true): void {
        const field = this.requireField(name);
        field.touched = isTouched;
        this.touched = { ...this.touched, [name]: isTouched };

        if (isTouched && field.validateOn === 'blur') {
            void this.validateField(name);
        }
    }

    async validateField<K extends keyof TValues>(name: K): Promise<boolean> {
        const field = this.requireField(name);
        const token = ++field.validationToken;

        let fieldError: string | null = null;

        for (const validator of field.validators) {
            const result = await validator(field.value, this.values);

            if (token !== field.validationToken) {
                return this.errors[name] == null;
            }

            if (result) {
                fieldError = result;
                break;
            }
        }

        field.error = fieldError;
        this.errors = { ...this.errors, [name]: fieldError };
        this.recomputeIsValid();
        return fieldError == null;
    }

    async validateAll(): Promise<boolean> {
        this.isValidating = true;
        try {
            const keys = Array.from(this.fields.keys());
            const results = await Promise.all(keys.map((key) => this.validateField(key)));
            return results.every(Boolean);
        } finally {
            this.isValidating = false;
        }
    }

    async handleSubmit(onSubmit: (values: TValues) => void | Promise<void>): Promise<void> {
        this.submitCount += 1;
        this.isSubmitting = true;

        this.fields.forEach((_, key) => this.setTouched(key, true));

        try {
            const valid = await this.validateAll();
            if (!valid) return;
            await onSubmit(this.values);
        } finally {
            this.isSubmitting = false;
        }
    }

    reset(nextValues?: Partial<TValues>): void {
        this.fields.forEach((field, key) => {
            const value = nextValues && key in nextValues ? (nextValues[key] as TValues[typeof key]) : field.initialValue;
            field.value = value;
            field.initialValue = value;
            field.error = null;
            field.touched = false;
            field.dirty = false;
            field.validationToken += 1;
        });

        this.values = this.snapshotValues();
        this.errors = {};
        this.touched = {};
        this.dirty = {};
        this.isValid = true;
        this.submitCount = 0;
    }

    getFieldProps<K extends keyof TValues>(name: K) {
        const field = this.requireField(name);
        return {
            name,
            value: field.value,
            error: this.errors[name] ?? null,
            touched: this.touched[name] ?? false,
            onChange: (value: TValues[K]) => this.setValue(name, value),
            onBlur: () => this.setTouched(name, true)
        };
    }

    destroy(): void {
        this.fields.forEach((field) => {
            field.validationToken += 1;
        });
        this.fields.clear();
    }

    private recomputeIsValid(): void {
        this.isValid = Array.from(this.fields.values()).every((field) => field.error == null);
    }

    private snapshotValues(): TValues {
        const next = {} as TValues;
        this.fields.forEach((field, key) => {
            next[key] = field.value as TValues[typeof key];
        });
        return next;
    }

    private requireField<K extends keyof TValues>(name: K): InternalFieldState<TValues[K]> {
        const field = this.fields.get(name);
        if (!field) {
            throw new Error(`[gea-form] Unknown field "${String(name)}"`);
        }
        return field as InternalFieldState<TValues[K]>;
    }
}

export function withForm<T extends new (...args: any[]) => any>(Base: T) {
    return class extends Base {
        _managedForms: GeaForm[] = [];

        createForm<TValues extends Record<string, unknown>>(
            schema: { [K in keyof TValues]: GeaFieldConfig<TValues[K]> },
            options?: GeaFormOptions
        ): GeaForm<TValues> {
            const form = new GeaForm<TValues>(schema, options);
            this._managedForms.push(form as unknown as GeaForm);
            return form;
        }

        dispose(...args: any[]) {
            this._managedForms.forEach((form) => form.destroy());
            this._managedForms = [];

            if (typeof super.dispose === 'function') {
                super.dispose(...args);
            }
        }
    };
}