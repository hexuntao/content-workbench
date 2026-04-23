export interface PaginationInput {
  page?: number;
  pageSize?: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMetadata;
}

export interface PaginationArgs {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function buildPaginationArgs(input: PaginationInput = {}): PaginationArgs {
  const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
  const pageSize = Math.min(Math.max(input.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
  };
}

export function createPaginatedResult<T>(
  items: T[],
  total: number,
  args: PaginationArgs,
): PaginatedResult<T> {
  return {
    items,
    pagination: {
      page: args.page,
      pageSize: args.pageSize,
      total,
    },
  };
}
