# gea-form

The definitive, **Zero-Hooks** form-state, validation, and submission library for **Gea (`@geajs/core`)**.

Designed from the ground up to respect Gea's core philosophy: **No Hooks, pure Object-Oriented Programming (OOP), and explicit resource management.**

## Features

- **📦 Zero Hooks, 100% Gea-Idiomatic**: Built using pure JS Classes and Component Mixins. No implicit reactive magic.
- **✅ Composable Field Validators**: Attach one or many async-capable validators per field; run on `change`, `blur`, or `submit`.
- **🔁 Race-Safe Async Validation**: Per-field validation tokens ensure a stale, slow validator can never overwrite a newer result.
- **🧮 Derived Form State**: `isValid`, `dirty`, and `touched` are tracked automatically as fields change.
- **🧹 Auto-Cleanup**: Forms created via `this.createForm` are automatically torn down when the component is disposed.

## Installation

```bash
pnpm add gea-form

```

## Quick Start

Wrap your Gea component with the `withForm` mixin. Use `this.createForm` to instantiate a reactive form store that ties its lifecycle automatically to the component's `dispose()`.

```typescript
import { Component } from '@geajs/core';
import { withForm } from 'gea-form';

interface LoginValues {
  email: string;
  password: string;
}

export default class LoginPage extends withForm(Component) {
  private loginForm!: any;

  created() {
    // 💡 Creates a form store. Automatically cleaned up when the component is disposed.
    this.loginForm = this.createForm<LoginValues>({
      email: {
        initialValue: '',
        validateOn: 'blur',
        validators: [
          (value) => (value.includes('@') ? null : 'Enter a valid email address')
        ]
      },
      password: {
        initialValue: '',
        validators: [
          (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters')
        ]
      }
    });
  }

  submit() {
    this.loginForm.handleSubmit(async (values) => {
      await fetch('/api/login', { method: 'POST', body: JSON.stringify(values) });
    });
  }

  template() {
    const email = this.loginForm.getFieldProps('email');
    const password = this.loginForm.getFieldProps('password');

    return `
      <form>
        <input value="${email.value}" oninput="${(e: any) => email.onChange(e.target.value)}" onblur="${email.onBlur}" />
        ${email.touched && email.error ? `<span>${email.error}</span>` : ''}

        <input type="password" value="${password.value}" oninput="${(e: any) => password.onChange(e.target.value)}" onblur="${password.onBlur}" />
        ${password.touched && password.error ? `<span>${password.error}</span>` : ''}

        <button onclick="${() => this.submit()}" disabled="${this.loginForm.isSubmitting}">Log in</button>
      </form>
    `;
  }
}

```

## API Reference

### `withForm(BaseComponent)`

A class mixin that extends your Gea `Component`. It injects the `createForm` method and overrides `dispose()` to clean up all tracked forms under the hood.

### `this.createForm(schema, options)`

Returns an instance of `GeaForm` that extends Gea's native `Store`.

### `GeaForm`

`GeaForm` can also be instantiated directly with `new GeaForm(schema, options)`.

#### Field Schema

Each key in the schema maps to a `GeaFieldConfig`:

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `initialValue` | `T` | — | Required. The field's starting value and the value `reset()` reverts to. |
| `validators` | `GeaValidator<T>[]` | `[]` | Run in order; the first non-null result becomes the field's error. |
| `validateOn` | `'change' \| 'blur' \| 'submit'` | `'change'` | When the field is automatically re-validated. |

A `GeaValidator<T>` is `(value: T, values: Record<string, unknown>) => string | null | Promise<string | null>`.

#### Form Options

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `validateOnMount` | `boolean` | `false` | Runs validation for every field immediately after construction. |

#### Form State Properties

Since `GeaForm` extends `Store`, these properties are fully reactive within your component templates:

* `values: TValues`: The current value of every field.
* `errors: Partial<Record<keyof TValues, string | null>>`: The last validation error per field.
* `touched` / `dirty`: Per-field interaction and change-tracking flags.
* `isValid: boolean`: True when no field currently has an error.
* `isSubmitting: boolean`: True while `handleSubmit`'s validation and callback are in flight.
* `isValidating: boolean`: True while `validateAll()` is running.
* `submitCount: number`: Number of times `handleSubmit` has been invoked.

#### Form Methods

* `setValue(name, value, shouldValidate?)`
Updates a single field's value, marks it dirty, and optionally triggers its `change`-time validation.
* `setValues(patch, shouldValidate?)`
Updates multiple fields at once, then validates all of them.
* `setTouched(name, isTouched?)`
Marks a field as touched and optionally triggers its `blur`-time validation.
* `validateField(name): Promise<boolean>`
Runs a single field's validators; race-safe against overlapping async calls.
* `validateAll(): Promise<boolean>`
Runs every field's validators in parallel.
* `handleSubmit(onSubmit): Promise<void>`
Touches every field, validates the whole form, and only invokes `onSubmit(values)` if it's valid.
* `getFieldProps(name)`
Returns `{ name, value, error, touched, onChange, onBlur }` for direct template binding.
* `reset(nextValues?)`
Restores all fields to their initial values (or the provided overrides) and clears all errors/touched/dirty state.
* `destroy(): void`
Invalidates any in-flight async validations and releases internal field references.

## License

MIT © [KoHaRxnP](https://github.com/KoHaRxnP)