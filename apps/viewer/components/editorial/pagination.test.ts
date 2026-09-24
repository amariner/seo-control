import { describe, expect, it } from "vitest";
import { editorialPagination } from "./pagination";

describe("editorial URL pagination", () => {
  it("keeps invalid query values within the available dataset", () => {
    expect(editorialPagination({ page: "999", rows: "25" }, 31)).toEqual({ page: 2, pageSize: 25, pageCount: 2, start: 25, end: 31 });
    expect(editorialPagination({ page: "Infinity", rows: "5000" }, 31)).toEqual({ page: 1, pageSize: 10, pageCount: 4, start: 0, end: 10 });
  });

  it("handles empty filtered results without a negative range", () => {
    expect(editorialPagination({ page: "3", rows: "50" }, 0)).toEqual({ page: 1, pageSize: 50, pageCount: 1, start: 0, end: 0 });
  });

  it("uses the first URL parameter value and only allows supported row counts", () => {
    expect(editorialPagination({ page: ["2", "3"], rows: ["100", "10"] }, 240)).toEqual({ page: 2, pageSize: 100, pageCount: 3, start: 100, end: 200 });
  });
});
