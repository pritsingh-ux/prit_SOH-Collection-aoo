// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { 
    getMappings, 
    saveMapping, 
    updateMapping, 
    deleteMapping, 
    bulkUploadMappings,
    getAuditLogs,
    bulkDeleteMappings
} from '../services/firebaseConfig';
import { MASTER_STORES } from '../constants';
import type { DistributorMapping, AuditLog } from '../types';

declare const XLSX: any;

export const DistributorMappingMaster: React.FC = () => {
    const [mappings, setMappings] = useState<DistributorMapping[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'LIST' | 'AUDIT'>('LIST');

    // Selection State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentMapping, setCurrentMapping] = useState<Partial<DistributorMapping> | null>(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkFile, setBulkFile] = useState<File | null>(null);
    const [bulkErrors, setBulkErrors] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setSelectedIds(new Set());
        try {
            const [mappingData, logData] = await Promise.all([
                getMappings(),
                getAuditLogs()
            ]);
            
            // If database is empty, we "import" the hardcoded ones into the view
            // so they are visible and manageable as requested.
            if (mappingData.length === 0) {
                const legacyMappings = MASTER_STORES.map(s => ({
                    storeId: s.id,
                    storeName: s.name,
                    distributor: s.distributor || 'N/A',
                    superDistributor: s.superDistributor || 'N/A',
                    region: s.region,
                    isLegacy: true // Flag to identify hardcoded data
                }));
                setMappings(legacyMappings);
            } else {
                setMappings(mappingData);
            }
            
            setAuditLogs(logData.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
        } catch (e) {
            setError('Failed to load mapping data');
        } finally {
            setLoading(false);
        }
    };

    const filteredMappings = useMemo(() => {
        return mappings.filter(m => 
            (m.storeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (m.storeId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (m.distributor?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (m.superDistributor?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );
    }, [mappings, searchTerm]);

    const handleImportFromConstants = async () => {
        if (!window.confirm("This will permanently save all hardcoded mappings to the database. Continue?")) return;
        
        setIsProcessing(true);
        const newMappings = MASTER_STORES.map(s => ({
            storeId: s.id,
            storeName: s.name,
            distributor: s.distributor || 'N/A',
            superDistributor: s.superDistributor || 'N/A',
            region: s.region
        }));

        const success = await bulkUploadMappings(newMappings, 'Admin (Initial Sync)');
        if (success) {
            alert("All hardcoded data has been successfully imported to the database.");
            loadData();
        } else {
            alert("Import failed.");
        }
        setIsProcessing(false);
    };

    const handleSaveMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentMapping?.storeId || !currentMapping?.storeName) {
            alert("Store ID and Name are required");
            return;
        }

        setIsProcessing(true);
        let success = false;
        
        // If it's a legacy mapping being edited, we treat it as a new save to DB
        if (currentMapping.docId) {
            success = await updateMapping(currentMapping.docId, currentMapping, 'Admin');
        } else {
            // This handles both brand new mappings and "Legacy" mappings being saved for the first time
            const id = await saveMapping({
                storeId: currentMapping.storeId,
                storeName: currentMapping.storeName,
                distributor: currentMapping.distributor || 'N/A',
                superDistributor: currentMapping.superDistributor || 'N/A',
                region: currentMapping.region || 'N/A'
            }, 'Admin');
            success = !!id;
        }

        if (success) {
            setIsEditModalOpen(false);
            loadData();
        } else {
            alert("Failed to save mapping");
        }
        setIsProcessing(false);
    };

    const handleDeleteMapping = async (mapping: DistributorMapping & { isLegacy?: boolean }) => {
        if (!window.confirm(`Delete mapping for ${mapping.storeName}?`)) return;
        
        if (mapping.isLegacy) {
            setMappings(prev => prev.filter(m => m.storeId !== mapping.storeId));
            alert("Legacy mapping removed from view.");
            return;
        }

        setIsProcessing(true);
        const success = await deleteMapping(mapping.docId!, mapping.storeName, 'Admin');
        if (success) {
            loadData();
        } else {
            alert("Failed to delete mapping");
        }
        setIsProcessing(false);
    };

    const handleBulkDeleteMappings = async () => {
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length === 0) return;
        
        if (!window.confirm(`Delete ${idsToDelete.length} selected mappings?`)) return;

        setIsProcessing(true);
        const success = await bulkDeleteMappings(idsToDelete, 'Admin');
        if (success) {
            alert("Mappings deleted successfully");
            loadData();
        } else {
            alert("Bulk delete failed");
        }
        setIsProcessing(false);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredMappings.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredMappings.map(m => m.docId).filter(id => !!id)));
        }
    };

    const toggleSelect = (docId: string) => {
        const next = new Set(selectedIds);
        if (next.has(docId)) {
            next.delete(docId);
        } else {
            next.add(docId);
        }
        setSelectedIds(next);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setBulkFile(file);
    };

    const processBulkUpload = async () => {
        if (!bulkFile) return;
        setIsProcessing(true);
        setBulkErrors([]);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const validMappings: any[] = [];
                const errors: string[] = [];

                json.forEach((row: any, index: number) => {
                    if (!row.StoreId || !row.StoreName || !row.Distributor || !row.SuperDistributor || !row.Region) {
                        errors.push(`Row ${index + 2}: Missing required fields (StoreId, StoreName, Distributor, SuperDistributor, Region)`);
                    } else {
                        validMappings.push({
                            storeId: String(row.StoreId),
                            storeName: String(row.StoreName),
                            distributor: String(row.Distributor),
                            superDistributor: String(row.SuperDistributor),
                            region: String(row.Region)
                        });
                    }
                });

                if (errors.length > 0) {
                    setBulkErrors(errors);
                    setIsProcessing(false);
                    return;
                }

                const success = await bulkUploadMappings(validMappings, 'Admin');
                if (success) {
                    alert(`Successfully uploaded ${validMappings.length} mappings`);
                    setIsBulkModalOpen(false);
                    loadData();
                } else {
                    alert("Bulk upload failed at server.");
                }
            } catch (err) {
                alert("Error reading Excel file. Ensure it is a valid .xlsx file.");
            }
            setIsProcessing(false);
        };
        reader.readAsArrayBuffer(bulkFile);
    };

    const downloadTemplate = () => {
        const template = [
            { StoreId: 'BSRN12345', StoreName: 'Example Store', Distributor: 'Distributor A', SuperDistributor: 'Super A', Region: 'Region X' }
        ];
        const ws = XLSX.utils.json_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "Distributor_Mapping_Template.xlsx");
    };

    const exportMappings = () => {
        const data = mappings.map(m => ({
            StoreId: m.storeId,
            StoreName: m.storeName,
            Distributor: m.distributor,
            SuperDistributor: m.superDistributor,
            Region: m.region,
            LastUpdated: m.updatedAt?.toDate ? m.updatedAt.toDate().toLocaleString() : 'N/A'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Mappings");
        XLSX.writeFile(wb, `Distributor_Mappings_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="animate-fade-in pb-10">
            {/* Header Section */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Distributor Mapping Master</h2>
                        <p className="text-slate-500 text-xs">Manage store to distributor and super distributor relationships</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selectedIds.size > 0 && (
                            <button 
                                onClick={handleBulkDeleteMappings}
                                className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors"
                            >
                                Delete Selected ({selectedIds.size})
                            </button>
                        )}
                        <button 
                            onClick={() => setView(view === 'LIST' ? 'AUDIT' : 'LIST')}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                        >
                            {view === 'LIST' ? 'Audit Logs' : 'Mappings'}
                        </button>
                        <button 
                            onClick={() => { setCurrentMapping({}); setIsEditModalOpen(true); }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add New
                        </button>
                        <button 
                            onClick={() => setIsBulkModalOpen(true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            Bulk
                        </button>
                    </div>
                </div>

                {view === 'LIST' && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input 
                                type="text" 
                                placeholder="Search..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={exportMappings}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Export
                            </button>
                            {mappings.some(m => m.isLegacy) && (
                                <button 
                                    onClick={handleImportFromConstants}
                                    className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium"
                                >
                                    Sync Legacy
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading mapping data...</p>
                </div>
            ) : view === 'LIST' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left w-10">
                                        {/* Select All Removed to prevent unintended bulk actions */}
                                    </th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Store Info</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distributor</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Super Distributor</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Region</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {filteredMappings.map((m) => (
                                    <tr key={m.docId || m.storeId} className={`hover:bg-slate-50 transition-colors ${selectedIds.has(m.docId) ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-3 py-2">
                                            {!m.isLegacy && (
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                                                    checked={selectedIds.has(m.docId)}
                                                    onChange={() => toggleSelect(m.docId)}
                                                />
                                            )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="text-xs font-bold text-slate-900">{m.storeName}</div>
                                            <div className="text-[10px] text-slate-500">{m.storeId}</div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                                            {m.distributor}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                                            {m.superDistributor}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                                {m.region}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-1">
                                                <button 
                                                    onClick={() => { setCurrentMapping(m); setIsEditModalOpen(true); }}
                                                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                    title="Edit Mapping"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                                    </svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteMapping(m)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    title="Delete Mapping"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredMappings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 text-sm">
                                            No mappings found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700">Audit Logs (Last 100)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {auditLogs.map((log) => (
                                    <tr key={log.docId}>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                            {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                                                log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                                                log.action === 'UPDATE' ? 'bg-indigo-100 text-indigo-700' :
                                                log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-medium">
                                            {log.adminName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">
                                            {log.details}
                                        </td>
                                    </tr>
                                ))}
                                {auditLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            No audit logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Edit/Add Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">
                                {currentMapping?.docId ? 'Edit Mapping' : 'Add New Mapping'}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleSaveMapping} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store ID (BSRN)</label>
                                <input 
                                    type="text" 
                                    required
                                    value={currentMapping?.storeId || ''}
                                    onChange={(e) => setCurrentMapping({...currentMapping, storeId: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. BSRN12345"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={currentMapping?.storeName || ''}
                                    onChange={(e) => setCurrentMapping({...currentMapping, storeName: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Madhu Store"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Distributor</label>
                                <input 
                                    type="text" 
                                    required
                                    value={currentMapping?.distributor || ''}
                                    onChange={(e) => setCurrentMapping({...currentMapping, distributor: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Super Distributor</label>
                                <input 
                                    type="text" 
                                    required
                                    value={currentMapping?.superDistributor || ''}
                                    onChange={(e) => setCurrentMapping({...currentMapping, superDistributor: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Region</label>
                                <input 
                                    type="text" 
                                    required
                                    value={currentMapping?.region || ''}
                                    onChange={(e) => setCurrentMapping({...currentMapping, region: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isProcessing}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400"
                                >
                                    {isProcessing ? 'Saving...' : 'Save Mapping'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900">Bulk Upload Mappings</h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                            <h4 className="text-sm font-bold text-amber-800 mb-2">Instructions:</h4>
                            <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                                <li>Upload an Excel (.xlsx) file with the correct headers.</li>
                                <li>Required Headers: <b>StoreId, StoreName, Distributor, SuperDistributor, Region</b></li>
                                <li>All fields are mandatory for every row.</li>
                            </ul>
                            <button 
                                onClick={downloadTemplate}
                                className="mt-3 text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Download Template
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="block w-full border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-300 transition-colors">
                                <input type="file" accept=".xlsx" onChange={handleFileUpload} className="hidden" />
                                <div className="flex flex-col items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-sm font-medium text-slate-600">
                                        {bulkFile ? bulkFile.name : 'Click to select Excel file'}
                                    </span>
                                </div>
                            </label>
                        </div>

                        {bulkErrors.length > 0 && (
                            <div className="mb-6 max-h-40 overflow-y-auto p-3 bg-red-50 border border-red-100 rounded-lg">
                                <h4 className="text-xs font-bold text-red-800 mb-1">Validation Errors:</h4>
                                <ul className="text-[10px] text-red-600 space-y-1">
                                    {bulkErrors.map((err, i) => <li key={i}>{err}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsBulkModalOpen(false)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={processBulkUpload}
                                disabled={!bulkFile || isProcessing}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-400"
                            >
                                {isProcessing ? 'Uploading...' : 'Upload & Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
