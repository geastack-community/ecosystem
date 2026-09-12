type AnyConstructor = new (...args: any[]) => any;

export type UnionMixins<T extends any[], Base> =
    T extends [...infer Head, infer Last extends (b: any) => any]
    ? UnionMixins<Head, ReturnType<Last>>
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