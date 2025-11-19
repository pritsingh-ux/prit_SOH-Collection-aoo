
import type { BdeInfo, StockData, Sku } from '../types';

declare const XLSX: any; // From script tag in index.html

export const exportToExcel = (bdeInfo: BdeInfo, stockData: StockData, allSkus: Sku[]) => {
  const skuMap = new Map(allSkus.map(sku => [sku.id, sku]));

  const dataToExport = Array.from(stockData.entries())
    .filter(([, count]) => count > 0)
    .map(([skuId, count]) => {
      const sku = skuMap.get(skuId);
      return {
        'Date': new Date().toLocaleDateString(),
        'BDE Name': bdeInfo.bdeName,
        'Region': bdeInfo.region,
        'Store Name': bdeInfo.store.name,
        'BSRN (Store ID)': bdeInfo.store.bsrn,
        'Product Code': skuId,
        'Product Name': sku?.name || 'N/A',
        'Category': sku?.category || 'N/A',
        'Type': sku?.type || 'N/A',
        'Stock Count': count,
      };
    });

  if (dataToExport.length === 0) {
    alert("No stock data entered. Nothing to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'StockData');

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 12 }, // Date
    { wch: 20 }, // BDE Name
    { wch: 15 }, // Region
    { wch: 25 }, // Store Name
    { wch: 15 }, // BSRN
    { wch: 15 }, // Product Code
    { wch: 40 }, // Product Name
    { wch: 15 }, // Category
    { wch: 12 }, // Type
    { wch: 12 }, // Stock Count
  ];

  // Format filename: SOH_StoreName_BSRN_Date.xlsx
  const cleanStoreName = bdeInfo.store.name.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
  const fileName = `SOH_${cleanStoreName}_${bdeInfo.store.bsrn}_${new Date().toISOString().split('T')[0]}.xlsx`;
  
  XLSX.writeFile(workbook, fileName);
};
