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
          illustration: "https://assets.skland.com/endfield/items/12345-card.webp",
          subType: {
            filterTagTree: [
              {
                id: "10000",
                name: "星级",
                children: [{ id: "10002", name: "2星", type: 2, value: "rarity_2" }]
              },
              {
                id: "10307",
                name: "品质",
                children: [{ id: "10311", name: "绿色品质", type: 1, value: "" }]
              },
              {
                id: "10244",
                name: "设备类型",
                children: [{ id: "10247", name: "资源开采", type: 1, value: "" }]
              }
            ]
          },
          brief: {
            subTypeList: [
              { subTypeId: "10000", value: "10002" },
              { subTypeId: "10307", value: "10311" },
              { subTypeId: "10244", value: "10247" }
            ]
          },
          document: {
            widgetCommonMap: {
              usage: {
                tabDataMap: {
                  default: {
                    content: "doc-usage"
                  }
                }
              }
            },
            documentMap: {
              "doc-usage": {
                blockIds: ["usage-a"],
                blockMap: {
                  "usage-a": {
                    id: "usage-a",
                    kind: "text",
                    text: {
                      inlineElements: [{ kind: "text", text: { text: "抽水机需要放置在资源点上。" } }]
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        sourceItemId: "12345",
        typeMainId: "1",
        typeSubId: "5"
      }
    );

    expect(detail).toMatchObject({
      sourceItemId: "12345",
      nameZhHans: "抽水机",
      descriptionZhHans: "用于抽取资源的设备。",
      iconUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
      illustrationUrl: "https://assets.skland.com/endfield/items/12345-card.webp",
      inGameTypeId: "10247",
      inGameTypeLabel: "资源开采",
      inGameRarityLabel: "2星",
      inGameQualityLabel: "绿色品质",
      usageHints: ["抽水机需要放置在资源点上。"],
      typeMainId: "1",
      typeSubId: "5",
      raw: expect.any(Object)
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

  it("falls back cleanly when item tag trees and usage documents are missing", () => {
    const detail = extractDetailRecord(
      {
        item: {
          itemId: "166",
          name: "电驱矿机"
        }
      },
      {
        sourceItemId: "166",
        typeMainId: "1",
        typeSubId: "5"
      }
    );

    expect(detail.inGameTypeId).toBeUndefined();
    expect(detail.inGameTypeLabel).toBeUndefined();
    expect(detail.inGameRarityLabel).toBeUndefined();
    expect(detail.inGameQualityLabel).toBeUndefined();
    expect(detail.usageHints).toEqual([]);
  });

  it("extracts only human-readable usage hints from rich document blocks", () => {
    const detail = extractDetailRecord(
      {
        item: {
          itemId: "166",
          name: "电驱矿机",
          document: {
            widgetCommonMap: {
              usage: {
                tabDataMap: {
                  default: {
                    content: "doc-usage"
                  }
                }
              }
            },
            documentMap: {
              "doc-usage": {
                id: "document-id",
                blockIds: ["divider", "usage-a", "usage-b"],
                blockMap: {
                  divider: {
                    id: "divider",
                    kind: "horizontalLine",
                    horizontalLine: {
                      kind: "5"
                    }
                  },
                  "usage-a": {
                    id: "usage-a",
                    kind: "text",
                    text: {
                      inlineElements: [{ kind: "text", text: { text: "电驱矿机必须放置在可用矿点上。" } }]
                    }
                  },
                  "usage-b": {
                    id: "usage-b",
                    kind: "text",
                    text: {
                      inlineElements: [
                        { kind: "text", text: { text: "资源开采类型的机器，可以用于矿物开采。" } },
                        { kind: "entry", entry: { id: "166", showType: "link-imgText", count: "1" } }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
      },
      {
        sourceItemId: "166",
        typeMainId: "1",
        typeSubId: "5"
      }
    );

    expect(detail.usageHints).toEqual([
      "电驱矿机必须放置在可用矿点上。",
      "资源开采类型的机器，可以用于矿物开采。"
    ]);
  });
});
