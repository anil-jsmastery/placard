import type { Data } from "@puckeditor/core";
import { expectTypeOf, it } from "vitest";
import type { PageData } from "./types";

// Checked by `npm run typecheck`: a PageData goes to Puck as Data with no cast.
it("PageData is assignable to Puck's Data", () => {
  expectTypeOf<PageData>().toExtend<Data>();
});
