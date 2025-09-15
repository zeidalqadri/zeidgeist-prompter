declare module 'drizzle-orm' {
  export const sql: any
  export function eq(a: any, b: any): any
  export function desc(a: any): any
  export function and(...args: any[]): any
  export function like(a: any, b: any): any
  export function gte(a: any, b: any): any
  export function gt(a: any, b: any): any
  export function lt(a: any, b: any): any
  export function lte(a: any, b: any): any
  export function isNull(a: any): any
  export function count(a?: any): any
}
