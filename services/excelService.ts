
import type { BdeInfo, StoreAudit, Sku } from '../types';

declare const XLSX: any; // From script tag in index.html

export const exportToExcel = (bdeInfo: BdeInfo, sessionAudits: StoreAudit[], allSkus: Sku[]) => {
  const skuMap = new Map(allSkus.map(sku => [sku.id, sku]));

  const allRows: any[] = [];

  sessionAudits.forEach(audit => {
      const storeRows = Array.from(audit.stockData.entries())
        .filter(([, count]) => count > 0)
        .map(([skuId, count]) => {
            const sku = skuMap.get(skuId);
            return {
                'Date': new Date(audit.timestamp).toLocaleDateString(),
                'BDE Name': bdeInfo.bdeName,
                'Region': bdeInfo.region,
                'Store Name': audit.store.name,
                'Store Id': audit.store.bsrn,
                'Product Code': skuId,
                'Product Name': sku?.name || 'N/A',
                'Category': sku?.category || 'N/A',
                'Type': sku?.type || 'N/A',
                'Stock Count': count,
            };
        });
      allRows.push(...storeRows);
  });

  if (allRows.length === 0) {
    alert("No stock data collected in this session. Nothing to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(allRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Compiled_SOH');

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 20 }, // BDE Name
    { wch: 15 }, // Region
    { wch: 25 }, // Store Name
    { wch: 15 }, // Store Id
    { wch: 15 }, // Product Code
    { wch: 40 }, // Product Name
    { wch: 15 }, // Category
    { wch: 12 }, // Type
    { wch: 12 }, // Stock Count
  ];

  // Format filename: SOH_Region_BDE_Date.xlsx
  const cleanRegion = bdeInfo.region.replace(/[^a-z0-9]/gi, '');
  const cleanBde = bdeInfo.bdeName.replace(/[^a-z0-9]/gi, '_').split('_')[0];
  const fileName = `SOH_Compiled_${cleanRegion}_${cleanBde}_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
};
