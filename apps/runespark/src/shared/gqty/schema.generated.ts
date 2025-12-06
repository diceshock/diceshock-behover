/**
 * GQty AUTO-GENERATED CODE: PLEASE DO NOT MODIFY MANUALLY
 */

import { type ScalarsEnumsHash } from "gqty";

export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
}

export interface ActiveTagMappingsTableActive_idFilters {
  OR?: InputMaybe<Array<ActiveTagMappingsTableActive_idfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagMappingsTableActive_idfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagMappingsTableFilters {
  OR?: InputMaybe<Array<ActiveTagMappingsTableFiltersOr>>;
  active_id?: InputMaybe<ActiveTagMappingsTableActive_idFilters>;
  tag_id?: InputMaybe<ActiveTagMappingsTableTag_idFilters>;
}

export interface ActiveTagMappingsTableFiltersOr {
  active_id?: InputMaybe<ActiveTagMappingsTableActive_idFilters>;
  tag_id?: InputMaybe<ActiveTagMappingsTableTag_idFilters>;
}

export interface ActiveTagMappingsTableInsertInput {
  active_id: Scalars["String"]["input"];
  tag_id: Scalars["String"]["input"];
}

export interface ActiveTagMappingsTableOrderBy {
  active_id?: InputMaybe<InnerOrder>;
  tag_id?: InputMaybe<InnerOrder>;
}

export interface ActiveTagMappingsTableTag_idFilters {
  OR?: InputMaybe<Array<ActiveTagMappingsTableTag_idfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagMappingsTableTag_idfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagMappingsTableUpdateInput {
  active_id?: InputMaybe<Scalars["String"]["input"]>;
  tag_id?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableFilters {
  OR?: InputMaybe<Array<ActiveTagsTableFiltersOr>>;
  id?: InputMaybe<ActiveTagsTableIdFilters>;
  title?: InputMaybe<ActiveTagsTableTitleFilters>;
}

export interface ActiveTagsTableFiltersOr {
  id?: InputMaybe<ActiveTagsTableIdFilters>;
  title?: InputMaybe<ActiveTagsTableTitleFilters>;
}

export interface ActiveTagsTableIdFilters {
  OR?: InputMaybe<Array<ActiveTagsTableIdfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableIdfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableInsertInput {
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  title?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableOrderBy {
  id?: InputMaybe<InnerOrder>;
  title?: InputMaybe<InnerOrder>;
}

export interface ActiveTagsTableTitleFilters {
  OR?: InputMaybe<Array<ActiveTagsTableTitlefiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableTitlefiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActiveTagsTableUpdateInput {
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  title?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableContentFilters {
  OR?: InputMaybe<Array<ActivesTableContentfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableContentfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableCover_imageFilters {
  OR?: InputMaybe<Array<ActivesTableCover_imagefiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableCover_imagefiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableDescriptionFilters {
  OR?: InputMaybe<Array<ActivesTableDescriptionfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableDescriptionfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableFilters {
  OR?: InputMaybe<Array<ActivesTableFiltersOr>>;
  content?: InputMaybe<ActivesTableContentFilters>;
  cover_image?: InputMaybe<ActivesTableCover_imageFilters>;
  description?: InputMaybe<ActivesTableDescriptionFilters>;
  id?: InputMaybe<ActivesTableIdFilters>;
  is_deleted?: InputMaybe<ActivesTableIs_deletedFilters>;
  is_published?: InputMaybe<ActivesTableIs_publishedFilters>;
  name?: InputMaybe<ActivesTableNameFilters>;
  publish_at?: InputMaybe<ActivesTablePublish_atFilters>;
}

export interface ActivesTableFiltersOr {
  content?: InputMaybe<ActivesTableContentFilters>;
  cover_image?: InputMaybe<ActivesTableCover_imageFilters>;
  description?: InputMaybe<ActivesTableDescriptionFilters>;
  id?: InputMaybe<ActivesTableIdFilters>;
  is_deleted?: InputMaybe<ActivesTableIs_deletedFilters>;
  is_published?: InputMaybe<ActivesTableIs_publishedFilters>;
  name?: InputMaybe<ActivesTableNameFilters>;
  publish_at?: InputMaybe<ActivesTablePublish_atFilters>;
}

export interface ActivesTableIdFilters {
  OR?: InputMaybe<Array<ActivesTableIdfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableIdfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableInsertInput {
  content?: InputMaybe<Scalars["String"]["input"]>;
  cover_image?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  is_deleted?: InputMaybe<Scalars["Boolean"]["input"]>;
  is_published?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  publish_at?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableIs_deletedFilters {
  OR?: InputMaybe<Array<ActivesTableIs_deletedfiltersOr>>;
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ne?: InputMaybe<Scalars["Boolean"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableIs_deletedfiltersOr {
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ne?: InputMaybe<Scalars["Boolean"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableIs_publishedFilters {
  OR?: InputMaybe<Array<ActivesTableIs_publishedfiltersOr>>;
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ne?: InputMaybe<Scalars["Boolean"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableIs_publishedfiltersOr {
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  gt?: InputMaybe<Scalars["Boolean"]["input"]>;
  gte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Boolean"]["input"]>;
  lte?: InputMaybe<Scalars["Boolean"]["input"]>;
  ne?: InputMaybe<Scalars["Boolean"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Boolean"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableNameFilters {
  OR?: InputMaybe<Array<ActivesTableNamefiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableNamefiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableOrderBy {
  content?: InputMaybe<InnerOrder>;
  cover_image?: InputMaybe<InnerOrder>;
  description?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  is_deleted?: InputMaybe<InnerOrder>;
  is_published?: InputMaybe<InnerOrder>;
  name?: InputMaybe<InnerOrder>;
  publish_at?: InputMaybe<InnerOrder>;
}

export interface ActivesTablePublish_atFilters {
  OR?: InputMaybe<Array<ActivesTablePublish_atfiltersOr>>;
  /** Date */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTablePublish_atfiltersOr {
  /** Date */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface ActivesTableUpdateInput {
  content?: InputMaybe<Scalars["String"]["input"]>;
  cover_image?: InputMaybe<Scalars["String"]["input"]>;
  description?: InputMaybe<Scalars["String"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  is_deleted?: InputMaybe<Scalars["Boolean"]["input"]>;
  is_published?: InputMaybe<Scalars["Boolean"]["input"]>;
  name?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  publish_at?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableBest_player_numFilters {
  OR?: InputMaybe<Array<BoardGamesTableBest_player_numfiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableBest_player_numfiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableCategoryFilters {
  OR?: InputMaybe<Array<BoardGamesTableCategoryfiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableCategoryfiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableContentFilters {
  OR?: InputMaybe<Array<BoardGamesTableContentfiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableContentfiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableEng_nameFilters {
  OR?: InputMaybe<Array<BoardGamesTableEng_namefiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableEng_namefiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableFilters {
  OR?: InputMaybe<Array<BoardGamesTableFiltersOr>>;
  best_player_num?: InputMaybe<BoardGamesTableBest_player_numFilters>;
  category?: InputMaybe<BoardGamesTableCategoryFilters>;
  content?: InputMaybe<BoardGamesTableContentFilters>;
  eng_name?: InputMaybe<BoardGamesTableEng_nameFilters>;
  gstone_id?: InputMaybe<BoardGamesTableGstone_idFilters>;
  gstone_rating?: InputMaybe<BoardGamesTableGstone_ratingFilters>;
  id?: InputMaybe<BoardGamesTableIdFilters>;
  mode?: InputMaybe<BoardGamesTableModeFilters>;
  player_num?: InputMaybe<BoardGamesTablePlayer_numFilters>;
  removeDate?: InputMaybe<BoardGamesTableRemoveDateFilters>;
  sch_name?: InputMaybe<BoardGamesTableSch_nameFilters>;
}

export interface BoardGamesTableFiltersOr {
  best_player_num?: InputMaybe<BoardGamesTableBest_player_numFilters>;
  category?: InputMaybe<BoardGamesTableCategoryFilters>;
  content?: InputMaybe<BoardGamesTableContentFilters>;
  eng_name?: InputMaybe<BoardGamesTableEng_nameFilters>;
  gstone_id?: InputMaybe<BoardGamesTableGstone_idFilters>;
  gstone_rating?: InputMaybe<BoardGamesTableGstone_ratingFilters>;
  id?: InputMaybe<BoardGamesTableIdFilters>;
  mode?: InputMaybe<BoardGamesTableModeFilters>;
  player_num?: InputMaybe<BoardGamesTablePlayer_numFilters>;
  removeDate?: InputMaybe<BoardGamesTableRemoveDateFilters>;
  sch_name?: InputMaybe<BoardGamesTableSch_nameFilters>;
}

export interface BoardGamesTableGstone_idFilters {
  OR?: InputMaybe<Array<BoardGamesTableGstone_idfiltersOr>>;
  eq?: InputMaybe<Scalars["Int"]["input"]>;
  gt?: InputMaybe<Scalars["Int"]["input"]>;
  gte?: InputMaybe<Scalars["Int"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Int"]["input"]>;
  lte?: InputMaybe<Scalars["Int"]["input"]>;
  ne?: InputMaybe<Scalars["Int"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableGstone_idfiltersOr {
  eq?: InputMaybe<Scalars["Int"]["input"]>;
  gt?: InputMaybe<Scalars["Int"]["input"]>;
  gte?: InputMaybe<Scalars["Int"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Int"]["input"]>;
  lte?: InputMaybe<Scalars["Int"]["input"]>;
  ne?: InputMaybe<Scalars["Int"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableGstone_ratingFilters {
  OR?: InputMaybe<Array<BoardGamesTableGstone_ratingfiltersOr>>;
  eq?: InputMaybe<Scalars["Float"]["input"]>;
  gt?: InputMaybe<Scalars["Float"]["input"]>;
  gte?: InputMaybe<Scalars["Float"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Float"]["input"]>;
  lte?: InputMaybe<Scalars["Float"]["input"]>;
  ne?: InputMaybe<Scalars["Float"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableGstone_ratingfiltersOr {
  eq?: InputMaybe<Scalars["Float"]["input"]>;
  gt?: InputMaybe<Scalars["Float"]["input"]>;
  gte?: InputMaybe<Scalars["Float"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Float"]["input"]>;
  lte?: InputMaybe<Scalars["Float"]["input"]>;
  ne?: InputMaybe<Scalars["Float"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Float"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableIdFilters {
  OR?: InputMaybe<Array<BoardGamesTableIdfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableIdfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableInsertInput {
  /** JSON */
  best_player_num?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  category?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  content?: InputMaybe<Scalars["String"]["input"]>;
  eng_name?: InputMaybe<Scalars["String"]["input"]>;
  gstone_id?: InputMaybe<Scalars["Int"]["input"]>;
  gstone_rating?: InputMaybe<Scalars["Float"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  mode?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  player_num?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  removeDate?: InputMaybe<Scalars["String"]["input"]>;
  sch_name?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableModeFilters {
  OR?: InputMaybe<Array<BoardGamesTableModefiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableModefiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableOrderBy {
  best_player_num?: InputMaybe<InnerOrder>;
  category?: InputMaybe<InnerOrder>;
  content?: InputMaybe<InnerOrder>;
  eng_name?: InputMaybe<InnerOrder>;
  gstone_id?: InputMaybe<InnerOrder>;
  gstone_rating?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  mode?: InputMaybe<InnerOrder>;
  player_num?: InputMaybe<InnerOrder>;
  removeDate?: InputMaybe<InnerOrder>;
  sch_name?: InputMaybe<InnerOrder>;
}

export interface BoardGamesTablePlayer_numFilters {
  OR?: InputMaybe<Array<BoardGamesTablePlayer_numfiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTablePlayer_numfiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableRemoveDateFilters {
  OR?: InputMaybe<Array<BoardGamesTableRemoveDatefiltersOr>>;
  /** Date */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableRemoveDatefiltersOr {
  /** Date */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<Date> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableSch_nameFilters {
  OR?: InputMaybe<Array<BoardGamesTableSch_namefiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableSch_namefiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface BoardGamesTableUpdateInput {
  /** JSON */
  best_player_num?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  category?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  content?: InputMaybe<Scalars["String"]["input"]>;
  eng_name?: InputMaybe<Scalars["String"]["input"]>;
  gstone_id?: InputMaybe<Scalars["Int"]["input"]>;
  gstone_rating?: InputMaybe<Scalars["Float"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  mode?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  player_num?: InputMaybe<Scalars["String"]["input"]>;
  /** Date */
  removeDate?: InputMaybe<Scalars["String"]["input"]>;
  sch_name?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableContentFilters {
  OR?: InputMaybe<Array<DocsTableContentfiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableContentfiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableCreate_atFilters {
  OR?: InputMaybe<Array<DocsTableCreate_atfiltersOr>>;
  eq?: InputMaybe<Scalars["Int"]["input"]>;
  gt?: InputMaybe<Scalars["Int"]["input"]>;
  gte?: InputMaybe<Scalars["Int"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Int"]["input"]>;
  lte?: InputMaybe<Scalars["Int"]["input"]>;
  ne?: InputMaybe<Scalars["Int"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableCreate_atfiltersOr {
  eq?: InputMaybe<Scalars["Int"]["input"]>;
  gt?: InputMaybe<Scalars["Int"]["input"]>;
  gte?: InputMaybe<Scalars["Int"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["Int"]["input"]>;
  lte?: InputMaybe<Scalars["Int"]["input"]>;
  ne?: InputMaybe<Scalars["Int"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["Int"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableFilters {
  OR?: InputMaybe<Array<DocsTableFiltersOr>>;
  content?: InputMaybe<DocsTableContentFilters>;
  create_at?: InputMaybe<DocsTableCreate_atFilters>;
  id?: InputMaybe<DocsTableIdFilters>;
  meta?: InputMaybe<DocsTableMetaFilters>;
}

export interface DocsTableFiltersOr {
  content?: InputMaybe<DocsTableContentFilters>;
  create_at?: InputMaybe<DocsTableCreate_atFilters>;
  id?: InputMaybe<DocsTableIdFilters>;
  meta?: InputMaybe<DocsTableMetaFilters>;
}

export interface DocsTableIdFilters {
  OR?: InputMaybe<Array<DocsTableIdfiltersOr>>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableIdfiltersOr {
  eq?: InputMaybe<Scalars["String"]["input"]>;
  gt?: InputMaybe<Scalars["String"]["input"]>;
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  lt?: InputMaybe<Scalars["String"]["input"]>;
  lte?: InputMaybe<Scalars["String"]["input"]>;
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<undefined> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableInsertInput {
  /** JSON */
  content?: InputMaybe<Scalars["String"]["input"]>;
  create_at?: InputMaybe<Scalars["Int"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  meta?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableMetaFilters {
  OR?: InputMaybe<Array<DocsTableMetafiltersOr>>;
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableMetafiltersOr {
  /** JSON */
  eq?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  gte?: InputMaybe<Scalars["String"]["input"]>;
  ilike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  inArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  isNotNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  isNull?: InputMaybe<Scalars["Boolean"]["input"]>;
  like?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lt?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  lte?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  ne?: InputMaybe<Scalars["String"]["input"]>;
  notIlike?: InputMaybe<Scalars["String"]["input"]>;
  /** Array<JSON> */
  notInArray?: InputMaybe<Array<Scalars["String"]["input"]>>;
  notLike?: InputMaybe<Scalars["String"]["input"]>;
}

export interface DocsTableOrderBy {
  content?: InputMaybe<InnerOrder>;
  create_at?: InputMaybe<InnerOrder>;
  id?: InputMaybe<InnerOrder>;
  meta?: InputMaybe<InnerOrder>;
}

export interface DocsTableUpdateInput {
  /** JSON */
  content?: InputMaybe<Scalars["String"]["input"]>;
  create_at?: InputMaybe<Scalars["Int"]["input"]>;
  id?: InputMaybe<Scalars["String"]["input"]>;
  /** JSON */
  meta?: InputMaybe<Scalars["String"]["input"]>;
}

export interface InnerOrder {
  direction: OrderDirection;
  /** Priority of current field */
  priority: Scalars["Int"]["input"];
}

/** Order by direction */
export enum OrderDirection {
  /** Ascending order */
  asc = "asc",
  /** Descending order */
  desc = "desc",
}

export const scalarsEnumsHash: ScalarsEnumsHash = {
  Boolean: true,
  Float: true,
  Int: true,
  OrderDirection: true,
  String: true,
};
export const generatedSchema = {
  ActiveTagMappingsTableActiveRelation: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String!" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
    tags: {
      __type: "[ActiveTagMappingsTableActiveRelationTagsRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
  },
  ActiveTagMappingsTableActiveRelationTagsRelation: {
    __typename: { __type: "String!" },
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActiveTagMappingsTableActive_idFilters: {
    OR: { __type: "[ActiveTagMappingsTableActive_idfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagMappingsTableActive_idfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagMappingsTableFilters: {
    OR: { __type: "[ActiveTagMappingsTableFiltersOr!]" },
    active_id: { __type: "ActiveTagMappingsTableActive_idFilters" },
    tag_id: { __type: "ActiveTagMappingsTableTag_idFilters" },
  },
  ActiveTagMappingsTableFiltersOr: {
    active_id: { __type: "ActiveTagMappingsTableActive_idFilters" },
    tag_id: { __type: "ActiveTagMappingsTableTag_idFilters" },
  },
  ActiveTagMappingsTableInsertInput: {
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActiveTagMappingsTableItem: {
    __typename: { __type: "String!" },
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActiveTagMappingsTableOrderBy: {
    active_id: { __type: "InnerOrder" },
    tag_id: { __type: "InnerOrder" },
  },
  ActiveTagMappingsTableSelectItem: {
    __typename: { __type: "String!" },
    active: {
      __type: "ActiveTagMappingsTableActiveRelation",
      __args: { where: "ActivesTableFilters" },
    },
    active_id: { __type: "String!" },
    tag: {
      __type: "ActiveTagMappingsTableTagRelation",
      __args: { where: "ActiveTagsTableFilters" },
    },
    tag_id: { __type: "String!" },
  },
  ActiveTagMappingsTableTagRelation: {
    __typename: { __type: "String!" },
    actives: {
      __type: "[ActiveTagMappingsTableTagRelationActivesRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    id: { __type: "String!" },
    title: { __type: "String" },
  },
  ActiveTagMappingsTableTagRelationActivesRelation: {
    __typename: { __type: "String!" },
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActiveTagMappingsTableTag_idFilters: {
    OR: { __type: "[ActiveTagMappingsTableTag_idfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagMappingsTableTag_idfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagMappingsTableUpdateInput: {
    active_id: { __type: "String" },
    tag_id: { __type: "String" },
  },
  ActiveTagsTableActivesRelation: {
    __typename: { __type: "String!" },
    active: {
      __type: "ActiveTagsTableActivesRelationActiveRelation",
      __args: { where: "ActivesTableFilters" },
    },
    active_id: { __type: "String!" },
    tag: {
      __type: "ActiveTagsTableActivesRelationTagRelation",
      __args: { where: "ActiveTagsTableFilters" },
    },
    tag_id: { __type: "String!" },
  },
  ActiveTagsTableActivesRelationActiveRelation: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String!" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
    tags: {
      __type: "[ActiveTagsTableActivesRelationActiveRelationTagsRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
  },
  ActiveTagsTableActivesRelationActiveRelationTagsRelation: {
    __typename: { __type: "String!" },
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActiveTagsTableActivesRelationTagRelation: {
    __typename: { __type: "String!" },
    id: { __type: "String!" },
    title: { __type: "String" },
  },
  ActiveTagsTableFilters: {
    OR: { __type: "[ActiveTagsTableFiltersOr!]" },
    id: { __type: "ActiveTagsTableIdFilters" },
    title: { __type: "ActiveTagsTableTitleFilters" },
  },
  ActiveTagsTableFiltersOr: {
    id: { __type: "ActiveTagsTableIdFilters" },
    title: { __type: "ActiveTagsTableTitleFilters" },
  },
  ActiveTagsTableIdFilters: {
    OR: { __type: "[ActiveTagsTableIdfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagsTableIdfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagsTableInsertInput: {
    id: { __type: "String" },
    title: { __type: "String" },
  },
  ActiveTagsTableItem: {
    __typename: { __type: "String!" },
    id: { __type: "String!" },
    title: { __type: "String" },
  },
  ActiveTagsTableOrderBy: {
    id: { __type: "InnerOrder" },
    title: { __type: "InnerOrder" },
  },
  ActiveTagsTableSelectItem: {
    __typename: { __type: "String!" },
    actives: {
      __type: "[ActiveTagsTableActivesRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    id: { __type: "String!" },
    title: { __type: "String" },
  },
  ActiveTagsTableTitleFilters: {
    OR: { __type: "[ActiveTagsTableTitlefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagsTableTitlefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActiveTagsTableUpdateInput: {
    id: { __type: "String" },
    title: { __type: "String" },
  },
  ActivesTableContentFilters: {
    OR: { __type: "[ActivesTableContentfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableContentfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableCover_imageFilters: {
    OR: { __type: "[ActivesTableCover_imagefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableCover_imagefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableDescriptionFilters: {
    OR: { __type: "[ActivesTableDescriptionfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableDescriptionfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableFilters: {
    OR: { __type: "[ActivesTableFiltersOr!]" },
    content: { __type: "ActivesTableContentFilters" },
    cover_image: { __type: "ActivesTableCover_imageFilters" },
    description: { __type: "ActivesTableDescriptionFilters" },
    id: { __type: "ActivesTableIdFilters" },
    is_deleted: { __type: "ActivesTableIs_deletedFilters" },
    is_published: { __type: "ActivesTableIs_publishedFilters" },
    name: { __type: "ActivesTableNameFilters" },
    publish_at: { __type: "ActivesTablePublish_atFilters" },
  },
  ActivesTableFiltersOr: {
    content: { __type: "ActivesTableContentFilters" },
    cover_image: { __type: "ActivesTableCover_imageFilters" },
    description: { __type: "ActivesTableDescriptionFilters" },
    id: { __type: "ActivesTableIdFilters" },
    is_deleted: { __type: "ActivesTableIs_deletedFilters" },
    is_published: { __type: "ActivesTableIs_publishedFilters" },
    name: { __type: "ActivesTableNameFilters" },
    publish_at: { __type: "ActivesTablePublish_atFilters" },
  },
  ActivesTableIdFilters: {
    OR: { __type: "[ActivesTableIdfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableIdfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableInsertInput: {
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
  },
  ActivesTableIs_deletedFilters: {
    OR: { __type: "[ActivesTableIs_deletedfiltersOr!]" },
    eq: { __type: "Boolean" },
    gt: { __type: "Boolean" },
    gte: { __type: "Boolean" },
    ilike: { __type: "String" },
    inArray: { __type: "[Boolean!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Boolean" },
    lte: { __type: "Boolean" },
    ne: { __type: "Boolean" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Boolean!]" },
    notLike: { __type: "String" },
  },
  ActivesTableIs_deletedfiltersOr: {
    eq: { __type: "Boolean" },
    gt: { __type: "Boolean" },
    gte: { __type: "Boolean" },
    ilike: { __type: "String" },
    inArray: { __type: "[Boolean!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Boolean" },
    lte: { __type: "Boolean" },
    ne: { __type: "Boolean" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Boolean!]" },
    notLike: { __type: "String" },
  },
  ActivesTableIs_publishedFilters: {
    OR: { __type: "[ActivesTableIs_publishedfiltersOr!]" },
    eq: { __type: "Boolean" },
    gt: { __type: "Boolean" },
    gte: { __type: "Boolean" },
    ilike: { __type: "String" },
    inArray: { __type: "[Boolean!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Boolean" },
    lte: { __type: "Boolean" },
    ne: { __type: "Boolean" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Boolean!]" },
    notLike: { __type: "String" },
  },
  ActivesTableIs_publishedfiltersOr: {
    eq: { __type: "Boolean" },
    gt: { __type: "Boolean" },
    gte: { __type: "Boolean" },
    ilike: { __type: "String" },
    inArray: { __type: "[Boolean!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Boolean" },
    lte: { __type: "Boolean" },
    ne: { __type: "Boolean" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Boolean!]" },
    notLike: { __type: "String" },
  },
  ActivesTableItem: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String!" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
  },
  ActivesTableNameFilters: {
    OR: { __type: "[ActivesTableNamefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableNamefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableOrderBy: {
    content: { __type: "InnerOrder" },
    cover_image: { __type: "InnerOrder" },
    description: { __type: "InnerOrder" },
    id: { __type: "InnerOrder" },
    is_deleted: { __type: "InnerOrder" },
    is_published: { __type: "InnerOrder" },
    name: { __type: "InnerOrder" },
    publish_at: { __type: "InnerOrder" },
  },
  ActivesTablePublish_atFilters: {
    OR: { __type: "[ActivesTablePublish_atfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTablePublish_atfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  ActivesTableSelectItem: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String!" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
    tags: {
      __type: "[ActivesTableTagsRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
  },
  ActivesTableTagsRelation: {
    __typename: { __type: "String!" },
    active: {
      __type: "ActivesTableTagsRelationActiveRelation",
      __args: { where: "ActivesTableFilters" },
    },
    active_id: { __type: "String!" },
    tag: {
      __type: "ActivesTableTagsRelationTagRelation",
      __args: { where: "ActiveTagsTableFilters" },
    },
    tag_id: { __type: "String!" },
  },
  ActivesTableTagsRelationActiveRelation: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String!" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
  },
  ActivesTableTagsRelationTagRelation: {
    __typename: { __type: "String!" },
    actives: {
      __type: "[ActivesTableTagsRelationTagRelationActivesRelation!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    id: { __type: "String!" },
    title: { __type: "String" },
  },
  ActivesTableTagsRelationTagRelationActivesRelation: {
    __typename: { __type: "String!" },
    active_id: { __type: "String!" },
    tag_id: { __type: "String!" },
  },
  ActivesTableUpdateInput: {
    content: { __type: "String" },
    cover_image: { __type: "String" },
    description: { __type: "String" },
    id: { __type: "String" },
    is_deleted: { __type: "Boolean" },
    is_published: { __type: "Boolean" },
    name: { __type: "String" },
    publish_at: { __type: "String" },
  },
  BoardGamesTableBest_player_numFilters: {
    OR: { __type: "[BoardGamesTableBest_player_numfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableBest_player_numfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableCategoryFilters: {
    OR: { __type: "[BoardGamesTableCategoryfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableCategoryfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableContentFilters: {
    OR: { __type: "[BoardGamesTableContentfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableContentfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableEng_nameFilters: {
    OR: { __type: "[BoardGamesTableEng_namefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableEng_namefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableFilters: {
    OR: { __type: "[BoardGamesTableFiltersOr!]" },
    best_player_num: { __type: "BoardGamesTableBest_player_numFilters" },
    category: { __type: "BoardGamesTableCategoryFilters" },
    content: { __type: "BoardGamesTableContentFilters" },
    eng_name: { __type: "BoardGamesTableEng_nameFilters" },
    gstone_id: { __type: "BoardGamesTableGstone_idFilters" },
    gstone_rating: { __type: "BoardGamesTableGstone_ratingFilters" },
    id: { __type: "BoardGamesTableIdFilters" },
    mode: { __type: "BoardGamesTableModeFilters" },
    player_num: { __type: "BoardGamesTablePlayer_numFilters" },
    removeDate: { __type: "BoardGamesTableRemoveDateFilters" },
    sch_name: { __type: "BoardGamesTableSch_nameFilters" },
  },
  BoardGamesTableFiltersOr: {
    best_player_num: { __type: "BoardGamesTableBest_player_numFilters" },
    category: { __type: "BoardGamesTableCategoryFilters" },
    content: { __type: "BoardGamesTableContentFilters" },
    eng_name: { __type: "BoardGamesTableEng_nameFilters" },
    gstone_id: { __type: "BoardGamesTableGstone_idFilters" },
    gstone_rating: { __type: "BoardGamesTableGstone_ratingFilters" },
    id: { __type: "BoardGamesTableIdFilters" },
    mode: { __type: "BoardGamesTableModeFilters" },
    player_num: { __type: "BoardGamesTablePlayer_numFilters" },
    removeDate: { __type: "BoardGamesTableRemoveDateFilters" },
    sch_name: { __type: "BoardGamesTableSch_nameFilters" },
  },
  BoardGamesTableGstone_idFilters: {
    OR: { __type: "[BoardGamesTableGstone_idfiltersOr!]" },
    eq: { __type: "Int" },
    gt: { __type: "Int" },
    gte: { __type: "Int" },
    ilike: { __type: "String" },
    inArray: { __type: "[Int!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Int" },
    lte: { __type: "Int" },
    ne: { __type: "Int" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Int!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableGstone_idfiltersOr: {
    eq: { __type: "Int" },
    gt: { __type: "Int" },
    gte: { __type: "Int" },
    ilike: { __type: "String" },
    inArray: { __type: "[Int!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Int" },
    lte: { __type: "Int" },
    ne: { __type: "Int" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Int!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableGstone_ratingFilters: {
    OR: { __type: "[BoardGamesTableGstone_ratingfiltersOr!]" },
    eq: { __type: "Float" },
    gt: { __type: "Float" },
    gte: { __type: "Float" },
    ilike: { __type: "String" },
    inArray: { __type: "[Float!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Float" },
    lte: { __type: "Float" },
    ne: { __type: "Float" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Float!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableGstone_ratingfiltersOr: {
    eq: { __type: "Float" },
    gt: { __type: "Float" },
    gte: { __type: "Float" },
    ilike: { __type: "String" },
    inArray: { __type: "[Float!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Float" },
    lte: { __type: "Float" },
    ne: { __type: "Float" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Float!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableIdFilters: {
    OR: { __type: "[BoardGamesTableIdfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableIdfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableInsertInput: {
    best_player_num: { __type: "String" },
    category: { __type: "String" },
    content: { __type: "String" },
    eng_name: { __type: "String" },
    gstone_id: { __type: "Int" },
    gstone_rating: { __type: "Float" },
    id: { __type: "String" },
    mode: { __type: "String" },
    player_num: { __type: "String" },
    removeDate: { __type: "String" },
    sch_name: { __type: "String" },
  },
  BoardGamesTableItem: {
    __typename: { __type: "String!" },
    best_player_num: { __type: "String" },
    category: { __type: "String" },
    content: { __type: "String" },
    eng_name: { __type: "String" },
    gstone_id: { __type: "Int" },
    gstone_rating: { __type: "Float" },
    id: { __type: "String!" },
    mode: { __type: "String" },
    player_num: { __type: "String" },
    removeDate: { __type: "String" },
    sch_name: { __type: "String" },
  },
  BoardGamesTableModeFilters: {
    OR: { __type: "[BoardGamesTableModefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableModefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableOrderBy: {
    best_player_num: { __type: "InnerOrder" },
    category: { __type: "InnerOrder" },
    content: { __type: "InnerOrder" },
    eng_name: { __type: "InnerOrder" },
    gstone_id: { __type: "InnerOrder" },
    gstone_rating: { __type: "InnerOrder" },
    id: { __type: "InnerOrder" },
    mode: { __type: "InnerOrder" },
    player_num: { __type: "InnerOrder" },
    removeDate: { __type: "InnerOrder" },
    sch_name: { __type: "InnerOrder" },
  },
  BoardGamesTablePlayer_numFilters: {
    OR: { __type: "[BoardGamesTablePlayer_numfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTablePlayer_numfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableRemoveDateFilters: {
    OR: { __type: "[BoardGamesTableRemoveDatefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableRemoveDatefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableSch_nameFilters: {
    OR: { __type: "[BoardGamesTableSch_namefiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableSch_namefiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  BoardGamesTableSelectItem: {
    __typename: { __type: "String!" },
    best_player_num: { __type: "String" },
    category: { __type: "String" },
    content: { __type: "String" },
    eng_name: { __type: "String" },
    gstone_id: { __type: "Int" },
    gstone_rating: { __type: "Float" },
    id: { __type: "String!" },
    mode: { __type: "String" },
    player_num: { __type: "String" },
    removeDate: { __type: "String" },
    sch_name: { __type: "String" },
  },
  BoardGamesTableUpdateInput: {
    best_player_num: { __type: "String" },
    category: { __type: "String" },
    content: { __type: "String" },
    eng_name: { __type: "String" },
    gstone_id: { __type: "Int" },
    gstone_rating: { __type: "Float" },
    id: { __type: "String" },
    mode: { __type: "String" },
    player_num: { __type: "String" },
    removeDate: { __type: "String" },
    sch_name: { __type: "String" },
  },
  DocsTableContentFilters: {
    OR: { __type: "[DocsTableContentfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableContentfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableCreate_atFilters: {
    OR: { __type: "[DocsTableCreate_atfiltersOr!]" },
    eq: { __type: "Int" },
    gt: { __type: "Int" },
    gte: { __type: "Int" },
    ilike: { __type: "String" },
    inArray: { __type: "[Int!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Int" },
    lte: { __type: "Int" },
    ne: { __type: "Int" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Int!]" },
    notLike: { __type: "String" },
  },
  DocsTableCreate_atfiltersOr: {
    eq: { __type: "Int" },
    gt: { __type: "Int" },
    gte: { __type: "Int" },
    ilike: { __type: "String" },
    inArray: { __type: "[Int!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "Int" },
    lte: { __type: "Int" },
    ne: { __type: "Int" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[Int!]" },
    notLike: { __type: "String" },
  },
  DocsTableFilters: {
    OR: { __type: "[DocsTableFiltersOr!]" },
    content: { __type: "DocsTableContentFilters" },
    create_at: { __type: "DocsTableCreate_atFilters" },
    id: { __type: "DocsTableIdFilters" },
    meta: { __type: "DocsTableMetaFilters" },
  },
  DocsTableFiltersOr: {
    content: { __type: "DocsTableContentFilters" },
    create_at: { __type: "DocsTableCreate_atFilters" },
    id: { __type: "DocsTableIdFilters" },
    meta: { __type: "DocsTableMetaFilters" },
  },
  DocsTableIdFilters: {
    OR: { __type: "[DocsTableIdfiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableIdfiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableInsertInput: {
    content: { __type: "String" },
    create_at: { __type: "Int" },
    id: { __type: "String" },
    meta: { __type: "String" },
  },
  DocsTableItem: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    create_at: { __type: "Int" },
    id: { __type: "String!" },
    meta: { __type: "String" },
  },
  DocsTableMetaFilters: {
    OR: { __type: "[DocsTableMetafiltersOr!]" },
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableMetafiltersOr: {
    eq: { __type: "String" },
    gt: { __type: "String" },
    gte: { __type: "String" },
    ilike: { __type: "String" },
    inArray: { __type: "[String!]" },
    isNotNull: { __type: "Boolean" },
    isNull: { __type: "Boolean" },
    like: { __type: "String" },
    lt: { __type: "String" },
    lte: { __type: "String" },
    ne: { __type: "String" },
    notIlike: { __type: "String" },
    notInArray: { __type: "[String!]" },
    notLike: { __type: "String" },
  },
  DocsTableOrderBy: {
    content: { __type: "InnerOrder" },
    create_at: { __type: "InnerOrder" },
    id: { __type: "InnerOrder" },
    meta: { __type: "InnerOrder" },
  },
  DocsTableSelectItem: {
    __typename: { __type: "String!" },
    content: { __type: "String" },
    create_at: { __type: "Int" },
    id: { __type: "String!" },
    meta: { __type: "String" },
  },
  DocsTableUpdateInput: {
    content: { __type: "String" },
    create_at: { __type: "Int" },
    id: { __type: "String" },
    meta: { __type: "String" },
  },
  InnerOrder: {
    direction: { __type: "OrderDirection!" },
    priority: { __type: "Int!" },
  },
  mutation: {
    __typename: { __type: "String!" },
    ds_db_deleteFromActiveTagMappingsTable: {
      __type: "[ActiveTagMappingsTableItem!]!",
      __args: { where: "ActiveTagMappingsTableFilters" },
    },
    ds_db_deleteFromActiveTagsTable: {
      __type: "[ActiveTagsTableItem!]!",
      __args: { where: "ActiveTagsTableFilters" },
    },
    ds_db_deleteFromActivesTable: {
      __type: "[ActivesTableItem!]!",
      __args: { where: "ActivesTableFilters" },
    },
    ds_db_deleteFromBoardGamesTable: {
      __type: "[BoardGamesTableItem!]!",
      __args: { where: "BoardGamesTableFilters" },
    },
    ds_db_deleteFromDocsTable: {
      __type: "[DocsTableItem!]!",
      __args: { where: "DocsTableFilters" },
    },
    ds_db_insertIntoActiveTagMappingsTable: {
      __type: "[ActiveTagMappingsTableItem!]!",
      __args: { values: "[ActiveTagMappingsTableInsertInput!]!" },
    },
    ds_db_insertIntoActiveTagMappingsTableSingle: {
      __type: "ActiveTagMappingsTableItem",
      __args: { values: "ActiveTagMappingsTableInsertInput!" },
    },
    ds_db_insertIntoActiveTagsTable: {
      __type: "[ActiveTagsTableItem!]!",
      __args: { values: "[ActiveTagsTableInsertInput!]!" },
    },
    ds_db_insertIntoActiveTagsTableSingle: {
      __type: "ActiveTagsTableItem",
      __args: { values: "ActiveTagsTableInsertInput!" },
    },
    ds_db_insertIntoActivesTable: {
      __type: "[ActivesTableItem!]!",
      __args: { values: "[ActivesTableInsertInput!]!" },
    },
    ds_db_insertIntoActivesTableSingle: {
      __type: "ActivesTableItem",
      __args: { values: "ActivesTableInsertInput!" },
    },
    ds_db_insertIntoBoardGamesTable: {
      __type: "[BoardGamesTableItem!]!",
      __args: { values: "[BoardGamesTableInsertInput!]!" },
    },
    ds_db_insertIntoBoardGamesTableSingle: {
      __type: "BoardGamesTableItem",
      __args: { values: "BoardGamesTableInsertInput!" },
    },
    ds_db_insertIntoDocsTable: {
      __type: "[DocsTableItem!]!",
      __args: { values: "[DocsTableInsertInput!]!" },
    },
    ds_db_insertIntoDocsTableSingle: {
      __type: "DocsTableItem",
      __args: { values: "DocsTableInsertInput!" },
    },
    ds_db_updateActiveTagMappingsTable: {
      __type: "[ActiveTagMappingsTableItem!]!",
      __args: {
        set: "ActiveTagMappingsTableUpdateInput!",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    ds_db_updateActiveTagsTable: {
      __type: "[ActiveTagsTableItem!]!",
      __args: {
        set: "ActiveTagsTableUpdateInput!",
        where: "ActiveTagsTableFilters",
      },
    },
    ds_db_updateActivesTable: {
      __type: "[ActivesTableItem!]!",
      __args: { set: "ActivesTableUpdateInput!", where: "ActivesTableFilters" },
    },
    ds_db_updateBoardGamesTable: {
      __type: "[BoardGamesTableItem!]!",
      __args: {
        set: "BoardGamesTableUpdateInput!",
        where: "BoardGamesTableFilters",
      },
    },
    ds_db_updateDocsTable: {
      __type: "[DocsTableItem!]!",
      __args: { set: "DocsTableUpdateInput!", where: "DocsTableFilters" },
    },
    intToJson: { __type: "String", __args: { data: "Int!" } },
    sendMessage: { __type: "Boolean", __args: { text: "String!" } },
  },
  query: {
    __typename: { __type: "String!" },
    ds_db_activeTagMappingsTable: {
      __type: "[ActiveTagMappingsTableSelectItem!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    ds_db_activeTagMappingsTableSingle: {
      __type: "ActiveTagMappingsTableSelectItem",
      __args: {
        offset: "Int",
        orderBy: "ActiveTagMappingsTableOrderBy",
        where: "ActiveTagMappingsTableFilters",
      },
    },
    ds_db_activeTagsTable: {
      __type: "[ActiveTagsTableSelectItem!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActiveTagsTableOrderBy",
        where: "ActiveTagsTableFilters",
      },
    },
    ds_db_activeTagsTableSingle: {
      __type: "ActiveTagsTableSelectItem",
      __args: {
        offset: "Int",
        orderBy: "ActiveTagsTableOrderBy",
        where: "ActiveTagsTableFilters",
      },
    },
    ds_db_activesTable: {
      __type: "[ActivesTableSelectItem!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "ActivesTableOrderBy",
        where: "ActivesTableFilters",
      },
    },
    ds_db_activesTableSingle: {
      __type: "ActivesTableSelectItem",
      __args: {
        offset: "Int",
        orderBy: "ActivesTableOrderBy",
        where: "ActivesTableFilters",
      },
    },
    ds_db_boardGamesTable: {
      __type: "[BoardGamesTableSelectItem!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "BoardGamesTableOrderBy",
        where: "BoardGamesTableFilters",
      },
    },
    ds_db_boardGamesTableSingle: {
      __type: "BoardGamesTableSelectItem",
      __args: {
        offset: "Int",
        orderBy: "BoardGamesTableOrderBy",
        where: "BoardGamesTableFilters",
      },
    },
    ds_db_docsTable: {
      __type: "[DocsTableSelectItem!]!",
      __args: {
        limit: "Int",
        offset: "Int",
        orderBy: "DocsTableOrderBy",
        where: "DocsTableFilters",
      },
    },
    ds_db_docsTableSingle: {
      __type: "DocsTableSelectItem",
      __args: {
        offset: "Int",
        orderBy: "DocsTableOrderBy",
        where: "DocsTableFilters",
      },
    },
    hello: { __type: "String" },
    methods: { __type: "[String!]" },
  },
  subscription: {
    __typename: { __type: "String!" },
    message: { __type: "String", __args: { text: "String" } },
  },
} as const;

export interface ActiveTagMappingsTableActiveRelation {
  __typename?: "ActiveTagMappingsTableActiveRelation";
  content?: Maybe<Scalars["String"]["output"]>;
  cover_image?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id?: Scalars["String"]["output"];
  is_deleted?: Maybe<Scalars["Boolean"]["output"]>;
  is_published?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  publish_at?: Maybe<Scalars["String"]["output"]>;
  tags: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagMappingsTableActiveRelationTagsRelation>;
}

export interface ActiveTagMappingsTableActiveRelationTagsRelation {
  __typename?: "ActiveTagMappingsTableActiveRelationTagsRelation";
  active_id?: Scalars["String"]["output"];
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagMappingsTableItem {
  __typename?: "ActiveTagMappingsTableItem";
  active_id?: Scalars["String"]["output"];
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagMappingsTableSelectItem {
  __typename?: "ActiveTagMappingsTableSelectItem";
  active: (args?: {
    where?: Maybe<ActivesTableFilters>;
  }) => Maybe<ActiveTagMappingsTableActiveRelation>;
  active_id?: Scalars["String"]["output"];
  tag: (args?: {
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Maybe<ActiveTagMappingsTableTagRelation>;
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagMappingsTableTagRelation {
  __typename?: "ActiveTagMappingsTableTagRelation";
  actives: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagMappingsTableTagRelationActivesRelation>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  title?: Maybe<Scalars["String"]["output"]>;
}

export interface ActiveTagMappingsTableTagRelationActivesRelation {
  __typename?: "ActiveTagMappingsTableTagRelationActivesRelation";
  active_id?: Scalars["String"]["output"];
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagsTableActivesRelation {
  __typename?: "ActiveTagsTableActivesRelation";
  active: (args?: {
    where?: Maybe<ActivesTableFilters>;
  }) => Maybe<ActiveTagsTableActivesRelationActiveRelation>;
  active_id?: Scalars["String"]["output"];
  tag: (args?: {
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Maybe<ActiveTagsTableActivesRelationTagRelation>;
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagsTableActivesRelationActiveRelation {
  __typename?: "ActiveTagsTableActivesRelationActiveRelation";
  content?: Maybe<Scalars["String"]["output"]>;
  cover_image?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id?: Scalars["String"]["output"];
  is_deleted?: Maybe<Scalars["Boolean"]["output"]>;
  is_published?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  publish_at?: Maybe<Scalars["String"]["output"]>;
  tags: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagsTableActivesRelationActiveRelationTagsRelation>;
}

export interface ActiveTagsTableActivesRelationActiveRelationTagsRelation {
  __typename?: "ActiveTagsTableActivesRelationActiveRelationTagsRelation";
  active_id?: Scalars["String"]["output"];
  tag_id?: Scalars["String"]["output"];
}

export interface ActiveTagsTableActivesRelationTagRelation {
  __typename?: "ActiveTagsTableActivesRelationTagRelation";
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  title?: Maybe<Scalars["String"]["output"]>;
}

export interface ActiveTagsTableItem {
  __typename?: "ActiveTagsTableItem";
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  title?: Maybe<Scalars["String"]["output"]>;
}

export interface ActiveTagsTableSelectItem {
  __typename?: "ActiveTagsTableSelectItem";
  actives: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagsTableActivesRelation>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  title?: Maybe<Scalars["String"]["output"]>;
}

export interface ActivesTableItem {
  __typename?: "ActivesTableItem";
  content?: Maybe<Scalars["String"]["output"]>;
  cover_image?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id?: Scalars["String"]["output"];
  is_deleted?: Maybe<Scalars["Boolean"]["output"]>;
  is_published?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  publish_at?: Maybe<Scalars["String"]["output"]>;
}

export interface ActivesTableSelectItem {
  __typename?: "ActivesTableSelectItem";
  content?: Maybe<Scalars["String"]["output"]>;
  cover_image?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id?: Scalars["String"]["output"];
  is_deleted?: Maybe<Scalars["Boolean"]["output"]>;
  is_published?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  publish_at?: Maybe<Scalars["String"]["output"]>;
  tags: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActivesTableTagsRelation>;
}

export interface ActivesTableTagsRelation {
  __typename?: "ActivesTableTagsRelation";
  active: (args?: {
    where?: Maybe<ActivesTableFilters>;
  }) => Maybe<ActivesTableTagsRelationActiveRelation>;
  active_id?: Scalars["String"]["output"];
  tag: (args?: {
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Maybe<ActivesTableTagsRelationTagRelation>;
  tag_id?: Scalars["String"]["output"];
}

export interface ActivesTableTagsRelationActiveRelation {
  __typename?: "ActivesTableTagsRelationActiveRelation";
  content?: Maybe<Scalars["String"]["output"]>;
  cover_image?: Maybe<Scalars["String"]["output"]>;
  description?: Maybe<Scalars["String"]["output"]>;
  id?: Scalars["String"]["output"];
  is_deleted?: Maybe<Scalars["Boolean"]["output"]>;
  is_published?: Maybe<Scalars["Boolean"]["output"]>;
  name?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  publish_at?: Maybe<Scalars["String"]["output"]>;
}

export interface ActivesTableTagsRelationTagRelation {
  __typename?: "ActivesTableTagsRelationTagRelation";
  actives: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActivesTableTagsRelationTagRelationActivesRelation>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  title?: Maybe<Scalars["String"]["output"]>;
}

export interface ActivesTableTagsRelationTagRelationActivesRelation {
  __typename?: "ActivesTableTagsRelationTagRelationActivesRelation";
  active_id?: Scalars["String"]["output"];
  tag_id?: Scalars["String"]["output"];
}

export interface BoardGamesTableItem {
  __typename?: "BoardGamesTableItem";
  /**
   * JSON
   */
  best_player_num?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  category?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  content?: Maybe<Scalars["String"]["output"]>;
  eng_name?: Maybe<Scalars["String"]["output"]>;
  gstone_id?: Maybe<Scalars["Int"]["output"]>;
  gstone_rating?: Maybe<Scalars["Float"]["output"]>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  mode?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  player_num?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  removeDate?: Maybe<Scalars["String"]["output"]>;
  sch_name?: Maybe<Scalars["String"]["output"]>;
}

export interface BoardGamesTableSelectItem {
  __typename?: "BoardGamesTableSelectItem";
  /**
   * JSON
   */
  best_player_num?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  category?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  content?: Maybe<Scalars["String"]["output"]>;
  eng_name?: Maybe<Scalars["String"]["output"]>;
  gstone_id?: Maybe<Scalars["Int"]["output"]>;
  gstone_rating?: Maybe<Scalars["Float"]["output"]>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  mode?: Maybe<Scalars["String"]["output"]>;
  /**
   * JSON
   */
  player_num?: Maybe<Scalars["String"]["output"]>;
  /**
   * Date
   */
  removeDate?: Maybe<Scalars["String"]["output"]>;
  sch_name?: Maybe<Scalars["String"]["output"]>;
}

export interface DocsTableItem {
  __typename?: "DocsTableItem";
  /**
   * JSON
   */
  content?: Maybe<Scalars["String"]["output"]>;
  create_at?: Maybe<Scalars["Int"]["output"]>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  meta?: Maybe<Scalars["String"]["output"]>;
}

export interface DocsTableSelectItem {
  __typename?: "DocsTableSelectItem";
  /**
   * JSON
   */
  content?: Maybe<Scalars["String"]["output"]>;
  create_at?: Maybe<Scalars["Int"]["output"]>;
  id?: Scalars["String"]["output"];
  /**
   * JSON
   */
  meta?: Maybe<Scalars["String"]["output"]>;
}

export interface Mutation {
  __typename?: "Mutation";
  ds_db_deleteFromActiveTagMappingsTable: (args?: {
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagMappingsTableItem>;
  ds_db_deleteFromActiveTagsTable: (args?: {
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Array<ActiveTagsTableItem>;
  ds_db_deleteFromActivesTable: (args?: {
    where?: Maybe<ActivesTableFilters>;
  }) => Array<ActivesTableItem>;
  ds_db_deleteFromBoardGamesTable: (args?: {
    where?: Maybe<BoardGamesTableFilters>;
  }) => Array<BoardGamesTableItem>;
  ds_db_deleteFromDocsTable: (args?: {
    where?: Maybe<DocsTableFilters>;
  }) => Array<DocsTableItem>;
  ds_db_insertIntoActiveTagMappingsTable: (args: {
    values: Array<ActiveTagMappingsTableInsertInput>;
  }) => Array<ActiveTagMappingsTableItem>;
  ds_db_insertIntoActiveTagMappingsTableSingle: (args: {
    values: ActiveTagMappingsTableInsertInput;
  }) => Maybe<ActiveTagMappingsTableItem>;
  ds_db_insertIntoActiveTagsTable: (args: {
    values: Array<ActiveTagsTableInsertInput>;
  }) => Array<ActiveTagsTableItem>;
  ds_db_insertIntoActiveTagsTableSingle: (args: {
    values: ActiveTagsTableInsertInput;
  }) => Maybe<ActiveTagsTableItem>;
  ds_db_insertIntoActivesTable: (args: {
    values: Array<ActivesTableInsertInput>;
  }) => Array<ActivesTableItem>;
  ds_db_insertIntoActivesTableSingle: (args: {
    values: ActivesTableInsertInput;
  }) => Maybe<ActivesTableItem>;
  ds_db_insertIntoBoardGamesTable: (args: {
    values: Array<BoardGamesTableInsertInput>;
  }) => Array<BoardGamesTableItem>;
  ds_db_insertIntoBoardGamesTableSingle: (args: {
    values: BoardGamesTableInsertInput;
  }) => Maybe<BoardGamesTableItem>;
  ds_db_insertIntoDocsTable: (args: {
    values: Array<DocsTableInsertInput>;
  }) => Array<DocsTableItem>;
  ds_db_insertIntoDocsTableSingle: (args: {
    values: DocsTableInsertInput;
  }) => Maybe<DocsTableItem>;
  ds_db_updateActiveTagMappingsTable: (args: {
    set: ActiveTagMappingsTableUpdateInput;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagMappingsTableItem>;
  ds_db_updateActiveTagsTable: (args: {
    set: ActiveTagsTableUpdateInput;
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Array<ActiveTagsTableItem>;
  ds_db_updateActivesTable: (args: {
    set: ActivesTableUpdateInput;
    where?: Maybe<ActivesTableFilters>;
  }) => Array<ActivesTableItem>;
  ds_db_updateBoardGamesTable: (args: {
    set: BoardGamesTableUpdateInput;
    where?: Maybe<BoardGamesTableFilters>;
  }) => Array<BoardGamesTableItem>;
  ds_db_updateDocsTable: (args: {
    set: DocsTableUpdateInput;
    where?: Maybe<DocsTableFilters>;
  }) => Array<DocsTableItem>;
  intToJson: (args: {
    data: Scalars["Int"]["input"];
  }) => Maybe<Scalars["String"]["output"]>;
  sendMessage: (args: {
    text: Scalars["String"]["input"];
  }) => Maybe<Scalars["Boolean"]["output"]>;
}

export interface Query {
  __typename?: "Query";
  ds_db_activeTagMappingsTable: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Array<ActiveTagMappingsTableSelectItem>;
  ds_db_activeTagMappingsTableSingle: (args?: {
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagMappingsTableOrderBy>;
    where?: Maybe<ActiveTagMappingsTableFilters>;
  }) => Maybe<ActiveTagMappingsTableSelectItem>;
  ds_db_activeTagsTable: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagsTableOrderBy>;
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Array<ActiveTagsTableSelectItem>;
  ds_db_activeTagsTableSingle: (args?: {
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActiveTagsTableOrderBy>;
    where?: Maybe<ActiveTagsTableFilters>;
  }) => Maybe<ActiveTagsTableSelectItem>;
  ds_db_activesTable: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActivesTableOrderBy>;
    where?: Maybe<ActivesTableFilters>;
  }) => Array<ActivesTableSelectItem>;
  ds_db_activesTableSingle: (args?: {
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<ActivesTableOrderBy>;
    where?: Maybe<ActivesTableFilters>;
  }) => Maybe<ActivesTableSelectItem>;
  ds_db_boardGamesTable: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<BoardGamesTableOrderBy>;
    where?: Maybe<BoardGamesTableFilters>;
  }) => Array<BoardGamesTableSelectItem>;
  ds_db_boardGamesTableSingle: (args?: {
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<BoardGamesTableOrderBy>;
    where?: Maybe<BoardGamesTableFilters>;
  }) => Maybe<BoardGamesTableSelectItem>;
  ds_db_docsTable: (args?: {
    limit?: Maybe<Scalars["Int"]["input"]>;
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<DocsTableOrderBy>;
    where?: Maybe<DocsTableFilters>;
  }) => Array<DocsTableSelectItem>;
  ds_db_docsTableSingle: (args?: {
    offset?: Maybe<Scalars["Int"]["input"]>;
    orderBy?: Maybe<DocsTableOrderBy>;
    where?: Maybe<DocsTableFilters>;
  }) => Maybe<DocsTableSelectItem>;
  hello?: Maybe<Scalars["String"]["output"]>;
  methods?: Maybe<Array<Scalars["String"]["output"]>>;
}

export interface Subscription {
  __typename?: "Subscription";
  message: (args?: {
    text?: Maybe<Scalars["String"]["input"]>;
  }) => Maybe<Scalars["String"]["output"]>;
}

export interface GeneratedSchema {
  query: Query;
  mutation: Mutation;
  subscription: Subscription;
}
