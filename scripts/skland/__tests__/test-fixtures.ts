import type {
  DownloadedAsset,
  SklandDetailRecord,
  SklandDiscoveryRecord
} from "../types";

export const sampleDiscoveryRecord: SklandDiscoveryRecord = {
  sourceItemId: "12345",
  typeMainId: "1",
  typeSubId: "5",
  nameZhHans: "抽水机",
  categoryName: "设备图鉴",
  subCategoryName: "生产设备",
  iconUrl: "https://assets.skland.com/endfield/items/12345-icon.png"
};

export const sampleDetailRecord: SklandDetailRecord = {
  sourceItemId: "12345",
  nameZhHans: "抽水机",
  descriptionZhHans: "用于抽取资源的设备。",
  iconUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
  illustrationUrl: "https://assets.skland.com/endfield/items/12345-card.webp",
  typeMainId: "1",
  typeSubId: "5",
  inGameTypeId: "10247",
  inGameTypeLabel: "资源开采",
  inGameRarityLabel: "2星",
  inGameQualityLabel: "绿色品质",
  usageHints: [
    "抽水机需要放置在资源点上。",
    "资源开采类设备可用于采集原料。"
  ],
  raw: {
    item: {
      id: "12345",
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
            blockIds: ["usage-a", "usage-b"],
            blockMap: {
              "usage-a": {
                id: "usage-a",
                kind: "text",
                text: {
                  inlineElements: [{ kind: "text", text: { text: "抽水机需要放置在资源点上。" } }]
                }
              },
              "usage-b": {
                id: "usage-b",
                kind: "text",
                text: {
                  inlineElements: [{ kind: "text", text: { text: "资源开采类设备可用于采集原料。" } }]
                }
              }
            }
          }
        }
      }
    }
  }
};

export const sampleDownloadedAssets: DownloadedAsset[] = [
  {
    kind: "icon",
    path: "game-data/assets/skland/items/machine.skland-12345/icon.png",
    sourceUrl: "https://assets.skland.com/endfield/items/12345-icon.png",
    mimeType: "image/png",
    sha256: "icon-sha"
  },
  {
    kind: "illustration",
    path: "game-data/assets/skland/items/machine.skland-12345/illustration.webp",
    sourceUrl: "https://assets.skland.com/endfield/items/12345-card.webp",
    mimeType: "image/webp",
    sha256: "illustration-sha"
  }
];
