// Shared search params defaults for dash route Links/navigates.
// Each default matches the validateSearch of the target route.

export const ORDERS_DEFAULTS = {
  q: "",
  status: "all" as const,
  sortBy: "start_at" as const,
  sortOrder: "desc" as const,
  groupBy: "none" as const,
  page: 1,
};

export const USERS_DEFAULTS = {
  q: "",
  page: 1,
};

export const TABLES_DEFAULTS = {
  q: "",
  type: "all" as const,
  status: "all" as const,
};

export const ACTIVES_DEFAULTS = {
  q: "",
  status: "all" as const,
};

export const GSZ_DEFAULTS = {
  q: "",
  mode: "all" as const,
  format: "all" as const,
  completion: "all" as const,
  gszSync: "all" as const,
  table: "",
  startDate: "",
  endDate: "",
  page: 1,
};

export const MEDIA_DEFAULTS = {
  q: "",
  type: "",
  sort: "uploaded-desc" as const,
};
