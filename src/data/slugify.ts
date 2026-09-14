/** `D/D/D` -> `d-d-d`, `@Ignister` -> `ignister`. Used for both ids. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
