import assert from "node:assert/strict";
import test from "node:test";
import { estimatePerspectiveOutputSize } from "../src/features/importers/imageImporter";

test("estimatePerspectiveOutputSize expands skewed quadrilaterals slightly", () => {
  const size = estimatePerspectiveOutputSize({
    topLeft: { x: 10, y: 10 },
    topRight: { x: 210, y: 0 },
    bottomRight: { x: 230, y: 320 },
    bottomLeft: { x: 0, y: 300 },
  });

  assert.equal(size.width, 216);
  assert.equal(size.height, 305);
});
