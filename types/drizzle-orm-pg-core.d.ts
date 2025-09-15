declare module 'drizzle-orm/pg-core' {
  export function pgTable(name: string, columns: any, extras?: any): any
  export function text(name: string): any
  export function timestamp(name: string, options?: any): any
  export function boolean(name: string): any
  export function integer(name: string): any
  export function uuid(name: string): any
  export function decimal(name: string, options?: any): any
  export function jsonb(name: string): any
  export function index(name: string): { on: (...cols: any[]) => any }
  export function uniqueIndex(name: string): { on: (...cols: any[]) => any }
}
