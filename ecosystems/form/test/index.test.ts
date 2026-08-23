import { describe, it, expect, vi } from 'vitest';
import { GeaForm, withForm, type GeaFieldConfig } from '../src/index';

vi.mock('@geajs/core', () => {
    class Store {
        dispose?(): void;
    }
    class Component {
        dispose() {
        }
    }
    return { Store, Component };
});

type LoginValues = {
    email: string;
    password: string;
};

type LoginSchema = { [K in keyof LoginValues]: GeaFieldConfig<LoginValues[K]> };

function makeLoginSchema(overrides: Partial<{ email: Partial<GeaFieldConfig<string>>; password: Partial<GeaFieldConfig<string>> }> = {}): LoginSchema {
    return {
        email: {
            initialValue: '',
            validateOn: 'change',
            validators: [(value) => (value.includes('@') ? null : 'Enter a valid email address')],
            ...overrides.email
        },
        password: {
            initialValue: '',
            validateOn: 'change',
            validators: [(value) => (value.length >= 8 ? null : 'Password must be at least 8 characters')],
            ...overrides.password
        }
    };
}

describe('GeaForm — initialization', () => {
    it('seeds values/errors/touched/dirty from the schema', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        expect(form.values).toEqual({ email: '', password: '' });
        expect(form.errors).toEqual({ email: null, password: null });
        expect(form.touched).toEqual({ email: false, password: false });
        expect(form.dirty).toEqual({ email: false, password: false });
        expect(form.isValid).toBe(true);
        expect(form.isSubmitting).toBe(false);
        expect(form.submitCount).toBe(0);
    });

    it('does not validate on mount by default', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        expect(form.errors.email).toBeNull();
        expect(form.errors.password).toBeNull();
    });

    it('validates immediately when validateOnMount is true', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema(), { validateOnMount: true });
        
        await Promise.resolve();
        await Promise.resolve();

        expect(form.errors.email).toBe('Enter a valid email address');
        expect(form.errors.password).toBe('Password must be at least 8 characters');
        expect(form.isValid).toBe(false);
    });
});

describe('GeaForm — setValue', () => {
    it('updates the value and marks the field dirty when changed from initial', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        form.setValue('email', 'me@example.com', false);

        expect(form.values.email).toBe('me@example.com');
        expect(form.dirty.email).toBe(true);
    });

    it('marks the field clean again if the value returns to its initial value', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        form.setValue('email', 'me@example.com', false);
        expect(form.dirty.email).toBe(true);

        form.setValue('email', '', false);
        expect(form.dirty.email).toBe(false);
    });

    it('triggers change-time validation by default', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        form.setValue('email', 'not-an-email');
        await Promise.resolve();
        await Promise.resolve();

        expect(form.errors.email).toBe('Enter a valid email address');
        expect(form.isValid).toBe(false);
    });

    it('does not validate when validateOn is "blur" and shouldValidate defaults are honored', async () => {
        const form = new GeaForm<LoginValues>(
            makeLoginSchema({ email: { initialValue: '', validateOn: 'blur', validators: [(v: string) => (v.includes('@') ? null : 'bad')] } })
        );

        form.setValue('email', 'not-an-email');
        await Promise.resolve();
        await Promise.resolve();

        expect(form.errors.email).toBeNull();
    });

    it('does not mutate the previous values/dirty objects (immutable snapshot writes)', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        const prevValues = form.values;
        const prevDirty = form.dirty;

        form.setValue('email', 'me@example.com', false);

        expect(form.values).not.toBe(prevValues);
        expect(form.dirty).not.toBe(prevDirty);
    });
});

describe('GeaForm — setValues (batch)', () => {
    it('applies multiple field updates and validates once', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        form.setValues({ email: 'me@example.com', password: 'longenough1' });
        await Promise.resolve();
        await Promise.resolve();

        expect(form.values).toEqual({ email: 'me@example.com', password: 'longenough1' });
        expect(form.errors.email).toBeNull();
        expect(form.errors.password).toBeNull();
        expect(form.isValid).toBe(true);
    });
});

describe('GeaForm — setTouched', () => {
    it('marks a field touched', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setTouched('email');
        expect(form.touched.email).toBe(true);
    });

    it('triggers blur-time validation when validateOn is "blur"', async () => {
        const form = new GeaForm<LoginValues>(
            makeLoginSchema({ email: { initialValue: '', validateOn: 'blur', validators: [(v: string) => (v.includes('@') ? null : 'bad email')] } })
        );

        form.setTouched('email');
        await Promise.resolve();
        await Promise.resolve();

        expect(form.errors.email).toBe('bad email');
    });

    it('does not trigger validation on touch when validateOn is "change"', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setTouched('email');
        await Promise.resolve();
        expect(form.errors.email).toBeNull();
    });
});

describe('GeaForm — validateField / validateAll', () => {
    it('runs validators in order and stops at the first failure', async () => {
        const first = vi.fn().mockReturnValue('first error');
        const second = vi.fn().mockReturnValue('second error');

        const form = new GeaForm<LoginValues>({
            email: { initialValue: '', validators: [first, second] },
            password: { initialValue: '', validators: [] }
        });

        const isValid = await form.validateField('email');

        expect(isValid).toBe(false);
        expect(form.errors.email).toBe('first error');
        expect(first).toHaveBeenCalledTimes(1);
        expect(second).not.toHaveBeenCalled();
    });

    it('clears the error when all validators pass', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValue('email', 'ok@example.com', false);

        const isValid = await form.validateField('email');

        expect(isValid).toBe(true);
        expect(form.errors.email).toBeNull();
    });

    it('supports async validators', async () => {
        const asyncValidator = vi.fn(async (value: string) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            return value === 'taken@example.com' ? 'Email already in use' : null;
        });

        const form = new GeaForm<LoginValues>({
            email: { initialValue: 'taken@example.com', validators: [asyncValidator] },
            password: { initialValue: '', validators: [] }
        });

        const isValid = await form.validateField('email');

        expect(isValid).toBe(false);
        expect(form.errors.email).toBe('Email already in use');
    });

    it('is race-safe: a stale async validation result never overwrites a newer one', async () => {
        
        
        
        let callCount = 0;
        let resolveSlow!: (value: string | null) => void;

        const validator = vi.fn((_value: string) => {
            callCount += 1;
            if (callCount === 1) {
                return new Promise<string | null>((resolve) => { resolveSlow = resolve; });
            }
            return Promise.resolve(null);
        });

        const form = new GeaForm<LoginValues>({
            email: { initialValue: '', validators: [validator] },
            password: { initialValue: '', validators: [] }
        });

        const slowRun = form.validateField('email'); 
        const fastRun = form.validateField('email'); 

        await fastRun;
        expect(form.errors.email).toBeNull();

        
        resolveSlow('stale error');
        await slowRun;

        expect(form.errors.email).toBeNull();
        expect(validator).toHaveBeenCalledTimes(2);
    });

    it('validateAll runs every field and reports overall validity', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());

        const allValid = await form.validateAll();
        expect(allValid).toBe(false);
        expect(form.isValid).toBe(false);

        form.setValues({ email: 'me@example.com', password: 'longenough1' }, false);
        const allValidAfterFix = await form.validateAll();
        expect(allValidAfterFix).toBe(true);
        expect(form.isValid).toBe(true);
    });

    it('sets isValidating to true only while validateAll is in-flight', async () => {
        let resolveValidator!: (v: string | null) => void;
        const form = new GeaForm<LoginValues>({
            email: { initialValue: '', validators: [() => new Promise((resolve) => { resolveValidator = resolve; })] },
            password: { initialValue: '', validators: [] }
        });

        const run = form.validateAll();
        expect(form.isValidating).toBe(true);

        resolveValidator(null);
        await run;

        expect(form.isValidating).toBe(false);
    });

    it('throws when validating an unknown field', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        // @ts-expect-error intentionally invalid field name for the runtime guard test
        await expect(form.validateField('nonexistent')).rejects.toThrow('[gea-form] Unknown field "nonexistent"');
    });
});

describe('GeaForm — handleSubmit', () => {
    it('touches every field and invokes onSubmit only when the form is valid', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValues({ email: 'me@example.com', password: 'longenough1' }, false);

        const onSubmit = vi.fn();
        await form.handleSubmit(onSubmit);

        expect(form.touched.email).toBe(true);
        expect(form.touched.password).toBe(true);
        expect(onSubmit).toHaveBeenCalledWith({ email: 'me@example.com', password: 'longenough1' });
        expect(form.isSubmitting).toBe(false);
        expect(form.submitCount).toBe(1);
    });

    it('does not invoke onSubmit when the form is invalid', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        const onSubmit = vi.fn();

        await form.handleSubmit(onSubmit);

        expect(onSubmit).not.toHaveBeenCalled();
        expect(form.isValid).toBe(false);
        expect(form.submitCount).toBe(1);
    });

    it('sets isSubmitting to true during submission and false afterward, even on error', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValues({ email: 'me@example.com', password: 'longenough1' }, false);

        let capturedDuringSubmit = false;
        const onSubmit = vi.fn(async () => {
            capturedDuringSubmit = form.isSubmitting;
            throw new Error('network error');
        });

        await expect(form.handleSubmit(onSubmit)).rejects.toThrow('network error');

        expect(capturedDuringSubmit).toBe(true);
        expect(form.isSubmitting).toBe(false);
    });

    it('increments submitCount on every call, valid or not', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        await form.handleSubmit(vi.fn());
        await form.handleSubmit(vi.fn());
        expect(form.submitCount).toBe(2);
    });
});

describe('GeaForm — reset', () => {
    it('restores all fields to their initial values and clears derived state', async () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValue('email', 'me@example.com');
        form.setTouched('email');
        await form.handleSubmit(vi.fn());

        form.reset();

        expect(form.values).toEqual({ email: '', password: '' });
        expect(form.errors).toEqual({});
        expect(form.touched).toEqual({});
        expect(form.dirty).toEqual({});
        expect(form.isValid).toBe(true);
        expect(form.submitCount).toBe(0);
    });

    it('accepts overrides that become the new initial values', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValue('email', 'me@example.com');

        form.reset({ email: 'reset@example.com' });

        expect(form.values.email).toBe('reset@example.com');

        
        
        form.setValue('email', 'reset@example.com', false);
        expect(form.dirty.email).toBe(false);

        form.setValue('email', 'changed@example.com', false);
        expect(form.dirty.email).toBe(true);
    });

    it('invalidates any in-flight validation after reset (stale results are discarded)', async () => {
        let resolveValidator!: (v: string | null) => void;
        const form = new GeaForm<LoginValues>({
            email: { initialValue: '', validators: [() => new Promise((resolve) => { resolveValidator = resolve; })] },
            password: { initialValue: '', validators: [] }
        });

        const pending = form.validateField('email');
        form.reset();
        resolveValidator('should not apply');

        await pending;
        expect(form.errors.email).toBeUndefined();
    });
});

describe('GeaForm — getFieldProps', () => {
    it('returns a binding object reflecting current field state', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        form.setValue('email', 'me@example.com', false);
        form.setTouched('email');

        const props = form.getFieldProps('email');

        expect(props.name).toBe('email');
        expect(props.value).toBe('me@example.com');
        expect(props.touched).toBe(true);
        expect(typeof props.onChange).toBe('function');
        expect(typeof props.onBlur).toBe('function');
    });

    it('onChange updates the form and onBlur marks the field touched', () => {
        const form = new GeaForm<LoginValues>(makeLoginSchema());
        const props = form.getFieldProps('password');

        props.onChange('longenough1');
        expect(form.values.password).toBe('longenough1');

        props.onBlur();
        expect(form.touched.password).toBe(true);
    });
});

describe('GeaForm — destroy', () => {
    it('discards results from validations still in flight when destroyed', async () => {
        let resolveValidator!: (v: string | null) => void;
        const form = new GeaForm<LoginValues>({
            email: { initialValue: '', validators: [() => new Promise((resolve) => { resolveValidator = resolve; })] },
            password: { initialValue: '', validators: [] }
        });

        const pending = form.validateField('email');
        form.destroy();
        resolveValidator('too late');

        await pending;
        expect(form.errors.email).toBeNull();
    });
});

describe('withForm mixin', () => {
    class Component {
        dispose() {
            
        }
    }

    it('injects createForm and tracks created forms', () => {
        class MyComponent extends withForm(Component) {}
        const instance = new MyComponent();

        const form = instance.createForm<LoginValues>(makeLoginSchema());

        expect(form).toBeInstanceOf(GeaForm);
        expect(instance._managedForms).toHaveLength(1);
        expect(instance._managedForms[0]).toBe(form);
    });

    it('destroys all managed forms and clears the registry on dispose', () => {
        class MyComponent extends withForm(Component) {}
        const instance = new MyComponent();
        const form = instance.createForm<LoginValues>(makeLoginSchema());
        const destroySpy = vi.spyOn(form, 'destroy');

        instance.dispose();

        expect(destroySpy).toHaveBeenCalledTimes(1);
        expect(instance._managedForms).toHaveLength(0);
    });

    it('calls the base class dispose() after cleaning up forms', () => {
        const baseDisposeSpy = vi.spyOn(Component.prototype, 'dispose');

        class MyComponent extends withForm(Component) {}
        const instance = new MyComponent();
        instance.createForm<LoginValues>(makeLoginSchema());
        instance.dispose();

        expect(baseDisposeSpy).toHaveBeenCalledTimes(1);
        baseDisposeSpy.mockRestore();
    });

    it('supports multiple independent forms per component', () => {
        class MyComponent extends withForm(Component) {}
        const instance = new MyComponent();

        const loginForm = instance.createForm<LoginValues>(makeLoginSchema());
        const profileForm = instance.createForm<{ nickname: string }>({
            nickname: { initialValue: '' }
        });
        const loginDestroySpy = vi.spyOn(loginForm, 'destroy');
        const profileDestroySpy = vi.spyOn(profileForm, 'destroy');

        expect(instance._managedForms).toHaveLength(2);

        instance.dispose();

        expect(loginDestroySpy).toHaveBeenCalledTimes(1);
        expect(profileDestroySpy).toHaveBeenCalledTimes(1);
    });
});