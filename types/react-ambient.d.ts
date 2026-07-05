declare module 'react' {
  export type ReactNode = any;
  export function useState<T>(initialState?: T | (() => T)):
    [T, (value: T | ((prev: T) => T)) => void];
  export function useRef<T>(initial?: T | null): { current: T | null };
  export function useEffect(effect: (...args: any[]) => any, deps?: any[]): void;
  export function useContext<T>(context: any): T;
  export function createElement(...args: any[]): any;
  export default {} as any;
}
