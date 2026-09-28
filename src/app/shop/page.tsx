import { listMarketplace, listMarketplaceCities } from "@/lib/actions";
import { ConsumerShopClient } from "./ConsumerShopClient";

export const dynamic = "force-dynamic";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const city = sp.city ?? null;
  const [items, cities] = await Promise.all([
    listMarketplace(city),
    listMarketplaceCities(),
  ]);

  return <ConsumerShopClient items={items} cities={cities} initialCity={city} />;
}
