import { Component, Store } from "@geajs/core";

export type Constructor<T = any> = new (...args: any[]) => T;
export type AnyConstructor = Constructor;
export type StoreConstructor<T = Store> = Constructor<T>;
export type ComponentConstructor<T = Component> = Constructor<T>;
export type MixinConstructor<TBase extends AnyConstructor, Mixin> =
    (new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & Mixin) &
    Omit<TBase, 'prototype'>;

export interface Disposable {
  dispose(): void;
}
type Added<M extends Mixin[], B extends AnyConstructor, Acc = unknown> =
    M extends [infer F extends Mixin, ...infer R extends Mixin[]]
        ? Added<R, B, Acc & InstanceType<ReturnType<F>>>
        : Acc;

export type UnionMixins<M extends Mixin[], B extends AnyConstructor> =
    MixinConstructor<B, Added<M, B>>;

export type Mixin = (Base: any) => any;

export type CreatorName<K extends string, D extends string> = string extends K ? D : K;


/**
 * Use this when applying multiple mixins.
 *
 * Pass the mixin functions first and the base class last.
 * The number of mixins is not limited.
 *
 * @param args Mixin functions followed by the base class.
 *
 * @example
 * ```ts
 * import { Component } from '@geajs/core';
 * import { withForm } from '@geastack-community/form';
 * import { withQuery } from '@geastack-community/query';
 * import { withMixins } from '@geastack-community/utils';
 *
 * class MyComponent extends withMixins(withForm, withQuery, Component) {
 *   created() {
 *     this.createQuery('users', fetchUsers);
 *   }
 * }
 * ```
 *
 * @example
 * To change the creator name (for example, to avoid a name conflict),
 * wrap the mixin in an arrow function:
 * ```ts
 * class MyComponent extends withMixins(
 *   withForm,
 *   (Base) => withQuery(Base, 'createMyQuery'),
 *   Component
 * ) {
 *   created() {
 *     this.createMyQuery('users', fetchUsers);
 *   }
 * }
 * ```
 */
export function withMixins<B extends AnyConstructor, M extends ((Base: B) => AnyConstructor)[]>(
    ...args: [...M, B]
): UnionMixins<M, B> {
    const base = args[args.length - 1] as B;
    const mixins = args.slice(0, -1) as Mixin[];
    return mixins.reduceRight((cur, mixin) => mixin(cur), base) as any;
}