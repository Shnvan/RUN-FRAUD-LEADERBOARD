export const ACCOUNT_TYPE_SEED:ReadonlyArray<{slug:string;label:string}>;
export function normalizeOtherAccountType(value:unknown):string;
export function parseAccountTypes(value:unknown,other:unknown):{slugs:string[];other:string|null};
