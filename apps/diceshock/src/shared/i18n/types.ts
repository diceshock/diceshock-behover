export type TranslationDict = {
  [key: string]: string | TranslationDict;
};

type JoinKey<Prefix extends string, Key extends string> = Prefix extends ""
  ? Key
  : `${Prefix}.${Key}`;

export type DotPath<T, Prefix extends string = ""> = T extends string
  ? never
  : {
      [Key in Extract<keyof T, string>]: T[Key] extends string
        ? JoinKey<Prefix, Key>
        : T[Key] extends TranslationDict
          ? JoinKey<Prefix, Key> | DotPath<T[Key], JoinKey<Prefix, Key>>
          : never;
    }[Extract<keyof T, string>];

export type TranslationKey<T extends TranslationDict = TranslationDict> =
  | DotPath<T>
  | (string & {});

export type TranslationValue<
  T,
  Path extends string,
> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? TranslationValue<T[Head], Rest>
    : never
  : Path extends keyof T
    ? T[Path]
    : never;
