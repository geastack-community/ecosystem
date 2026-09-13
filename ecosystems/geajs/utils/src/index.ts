import { Component, Store } from "@geajs/core";

export type Constructor<T = any> = new (...args: any[]) => T;
export type AnyConstructor = Constructor;
export type StoreConstructor<T = Store> = Constructor<T>;
export type ComponentConstructor<T = Component> = Constructor<T>;
export type MixinConstructor<
    TBase extends AnyConstructor,
    Mixin
> = new (...args: ConstructorParameters<TBase>) => Mixin;

export interface Disposable {
  dispose(): void;
}

export type UnionMixins<M extends Mixin[], Base extends AnyConstructor> = 
    M extends [infer First extends Mixin, ...infer Rest extends Mixin[]]
    ? ReturnType<First> & UnionMixins<Rest, Base>
    : Base;

export type Mixin = (Base: any) => any;

export function withMixins<M extends Mixin[], B extends AnyConstructor>(
    ...args: [...M, B]
): UnionMixins<M, B> {
    const BaseClass = args[args.length - 1];
    const mixins = args.slice(0, -1) as Mixin[];

    return mixins.reduceRight((currentBase, currentMixin) => {
        return currentMixin(currentBase);
    }, BaseClass) as unknown as UnionMixins<M, B>;
}