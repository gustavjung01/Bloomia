import type { RouteKey } from '../../app/routes';
import { listFlowerOrders, listTodayDeliveries } from '../../db/repositories/ordersRepository';
import { listInventoryOverview } from '../../db/repositories/inventoryRepository';
import { getDashboardSummary, getInventoryReport, getSalesReport, getWasteReport } from '../../db/repositories/reportsRepository';
import { listRecipes } from '../../db/repositories/recipesRepository';
import { listItems, listSuppliers } from '../../db/repositories/manualSetupRepository';
import { listRecentSales } from '../../db/repositories/salesRepository';
import { getBloomiaAppStatus, listBloomiaBackups } from '../../services/system/systemService';

export async function buildTabContext(tabKey: RouteKey) {
  const data = await readTabData(tabKey);
  return JSON.stringify(data);
}

async function readTabData(tabKey: RouteKey) {
  if (tabKey === 'dashboard') return { summary: await getDashboardSummary(), sales7d: await getSalesReport(7) };
  if (tabKey === 'sales') return { recentSales: await listRecentSales(8), recipes: await listRecipes() };
  if (tabKey === 'flowerOrders') return { orders: await listFlowerOrders(), today: await listTodayDeliveries() };
  if (tabKey === 'inventory') return { inventory: await listInventoryOverview() };
  if (tabKey === 'purchase') return { inventory: await listInventoryOverview(), suppliers: await listSuppliers() };
  if (tabKey === 'recipes') return { recipes: await listRecipes() };
  if (tabKey === 'reports') return { sales: await getSalesReport(30), inventory: await getInventoryReport(), waste: await getWasteReport(30) };
  if (tabKey === 'settings') return { items: await listItems(), suppliers: await listSuppliers() };
  if (tabKey === 'system' || tabKey === 'update') return { status: await getBloomiaAppStatus(), backups: await listBloomiaBackups() };
  return { recentSales: await listRecentSales(12) };
}
