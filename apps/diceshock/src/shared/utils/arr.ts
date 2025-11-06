export const toggleArr = <I, T extends I>(
    arr: I[],
    item: T,
    force?: boolean
) => {
    const includes = arr.includes(item);

    if (force === includes) return arr;

    if (includes) return arr.filter((i) => i !== item);

    return [...arr, item];
};
