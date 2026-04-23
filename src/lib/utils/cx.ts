type ClassNameValue = false | null | string | undefined;

export function cx(...classNames: ClassNameValue[]): string {
  return classNames.filter((value): value is string => typeof value === "string").join(" ");
}
