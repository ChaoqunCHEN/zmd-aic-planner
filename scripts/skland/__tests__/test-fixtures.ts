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
  raw: {
    id: "12345"
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
