import type { TransformFnParams } from 'class-transformer';

/** Трансформеры для @Transform(): нормализуют строки до валидации. */

export const trim = ({ value }: TransformFnParams): unknown => (typeof value === 'string' ? value.trim() : value);

export const trimLower = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/** `a,b` или `?x=a&x=b` → `['a', 'b']`, без пустых элементов. */
export const splitList = ({ value }: TransformFnParams): unknown => {
  const raw: unknown = Array.isArray(value) ? value.join(',') : value;
  return typeof raw === 'string'
    ? raw
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    : raw;
};
