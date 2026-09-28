import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { listMyOrders, listOrderItems } from "@/lib/actions";
import { VendorOrdersClient } from "./VendorOrdersClient";

export const dynamic = "force-dynamic";

export default async function VendorOrdersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "VENDOR_CLERK") redirect("/vendor");
  if (session.role !== "VENDOR_OWNER") {
    redirect("/admin");
  }

  const orders = await listMyOrders();

  // Fetch items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (o) => ({
      ...o,
      items: await listOrderItems(o.id),
    }))
  );

  return <VendorOrdersClient orders={ordersWithItems} canManage={session.role === "VENDOR_OWNER"} />;
}
