import type { SklandDiscoveryRecord } from "./types";

export type DiscoveryClient = {
  getItemList(input: { typeMainId: string; typeSubId: string }): Promise<SklandDiscoveryRecord[]>;
  getCatalog(input: { typeMainId: string; typeSubId: string }): Promise<SklandDiscoveryRecord[]>;
};

export async function discoverEquipmentItems(input: {
  client: DiscoveryClient;
  typeMainId: string;
  typeSubId: string;
}) {
  const request = {
    typeMainId: input.typeMainId,
    typeSubId: input.typeSubId
  };

  const itemList = await input.client.getItemList(request);
  if (itemList.length > 0) {
    return itemList;
  }

  return input.client.getCatalog(request);
}
