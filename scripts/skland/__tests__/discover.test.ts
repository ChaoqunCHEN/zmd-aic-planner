// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { sampleDiscoveryRecord } from "./test-fixtures";
import { discoverEquipmentItems } from "../discover";

describe("discoverEquipmentItems", () => {
  it("prefers the item list endpoint when it returns records", async () => {
    const getItemList = vi.fn().mockResolvedValue([sampleDiscoveryRecord]);
    const getCatalog = vi.fn().mockResolvedValue([]);

    const records = await discoverEquipmentItems({
      client: {
        getItemList,
        getCatalog
      },
      typeMainId: "1",
      typeSubId: "5"
    });

    expect(records).toEqual([sampleDiscoveryRecord]);
    expect(getItemList).toHaveBeenCalledTimes(1);
    expect(getCatalog).not.toHaveBeenCalled();
  });

  it("falls back to the catalog endpoint when the item list is empty", async () => {
    const getItemList = vi.fn().mockResolvedValue([]);
    const getCatalog = vi.fn().mockResolvedValue([sampleDiscoveryRecord]);

    const records = await discoverEquipmentItems({
      client: {
        getItemList,
        getCatalog
      },
      typeMainId: "1",
      typeSubId: "5"
    });

    expect(records).toEqual([sampleDiscoveryRecord]);
    expect(getItemList).toHaveBeenCalledTimes(1);
    expect(getCatalog).toHaveBeenCalledTimes(1);
  });
});
