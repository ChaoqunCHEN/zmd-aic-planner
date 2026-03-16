// @vitest-environment node

import { describe, expect, it } from "vitest";
import { extractDiscoveryRecords, extractDetailRecord, unwrapSklandData } from "../client";

describe("unwrapSklandData", () => {
  it("throws on guarded source errors so callers can back off instead of retrying blindly", () => {
    expect(() =>
      unwrapSklandData({
        code: 10000,
        message: "请求异常"
      })
    ).toThrow("请求异常");
  });
});

describe("extractDiscoveryRecords", () => {
  it("normalizes list and catalog payloads into discovery records", () => {
    const records = extractDiscoveryRecords({
      catalog: [
        {
          id: "12345",
          name: "抽水机",
          icon: "https://assets.skland.com/endfield/items/12345-icon.png",
          type: {
            mainId: "1",
            subId: "5",
            mainName: "设备图鉴",
            subName: "生产设备"
          }
        }
      ]
    });

    expect(records).toEqual([
      {
        sourceItemId: "12345",
        nameZhHans: "抽水机",
        iconUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
        typeMainId: "1",
        typeSubId: "5",
        categoryName: "设备图鉴",
        subCategoryName: "生产设备"
      }
    ]);
  });
});

describe("extractDetailRecord", () => {
  it("pulls the canonical fields needed by the normalizer from nested item payloads", () => {
    const detail = extractDetailRecord(
      {
        item: {
          id: "12345",
          name: "抽水机",
          desc: "用于抽取资源的设备。",
          icon: "https://assets.skland.com/endfield/items/12345-icon.png",
          illustration: "https://assets.skland.com/endfield/items/12345-card.webp"
        }
      },
      {
        sourceItemId: "12345",
        typeMainId: "1",
        typeSubId: "5"
      }
    );

    expect(detail).toEqual({
      sourceItemId: "12345",
      nameZhHans: "抽水机",
      descriptionZhHans: "用于抽取资源的设备。",
      iconUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
      illustrationUrl: "https://assets.skland.com/endfield/items/12345-card.webp",
      typeMainId: "1",
      typeSubId: "5",
      raw: {
        item: {
          id: "12345",
          name: "抽水机",
          desc: "用于抽取资源的设备。",
          icon: "https://assets.skland.com/endfield/items/12345-icon.png",
          illustration: "https://assets.skland.com/endfield/items/12345-card.webp"
        }
      }
    });
  });

  it("extracts the live Skland cover image from brief metadata when direct image fields are absent", () => {
    const detail = extractDetailRecord(
      {
        item: {
          itemId: "752",
          name: "天有洪炉",
          brief: {
            cover: "https://bbs.hycdn.cn/image/2025/12/19/279234/c6fbccc8a4fd3f73abce13fb7ffde02a.png"
          }
        }
      },
      {
        sourceItemId: "752",
        typeMainId: "1",
        typeSubId: "5"
      }
    );

    expect(detail.iconUrl).toBe(
      "https://bbs.hycdn.cn/image/2025/12/19/279234/c6fbccc8a4fd3f73abce13fb7ffde02a.png"
    );
    expect(detail.illustrationUrl).toBeUndefined();
  });
});
