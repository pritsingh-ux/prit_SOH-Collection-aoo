import React, { useState, useEffect, useCallback } from 'react';
import { 
    getMasterBdes, saveMasterBde, updateMasterBde, deleteMasterBde,
    getMasterProducts, saveMasterProduct, updateMasterProduct, deleteMasterProduct,
    getMasterSuperDistributors, saveMasterSuperDistributor, updateMasterSuperDistributor, deleteMasterSuperDistributor,
    getMasterDistributors, saveMasterDistributor, updateMasterDistributor, deleteMasterDistributor,
    getMasterStores, saveMasterStore, updateMasterStore, deleteMasterStore,
    initializeMasterData, clearMasterData
} from '../services/firebaseConfig';
import type { MasterBde, MasterProduct, MasterSuperDistributor, MasterDistributor, MasterStore } from '../types';
import { Plus, Trash2, Edit2, Save, X, Search, Package, Users, ShieldCheck, MapPin, Store as StoreIcon, Database, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { BDE_DETAILS, ALL_SKUS, MASTER_STORES } from '../constants';

type MasterTab = 'BDE' | 'PRODUCT' | 'SUPER_DIST' | 'DIST' | 'STORE';

export const MasterDataManager: React.FC = () => {
    const [activeTab, setActiveTab] = useState<MasterTab>('BDE');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Data States
    const [bdes, setBdes] = useState<MasterBde[]>([]);
    const [products, setProducts] = useState<MasterProduct[]>([]);
    const [superDists, setSuperDists] = useState<MasterSuperDistributor[]>([]);
    const [dists, setDists] = useState<MasterDistributor[]>([]);
    const [stores, setStores] = useState<MasterStore[]>([]);

    // Edit/Add States
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});

    const [isFallback, setIsFallback] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            switch (activeTab) {
                case 'BDE': {
                    const data = await getMasterBdes();
                    if (data.length > 0) {
                        setBdes(data);
                        setIsFallback(false);
                    } else {
                        setBdes(BDE_DETAILS.map((b, i) => ({ id: `fallback-bde-${i}`, ...b })));
                        setIsFallback(true);
                    }
                    break;
                }
                case 'PRODUCT': {
                    const data = await getMasterProducts();
                    if (data.length > 0) {
                        setProducts(data);
                        setIsFallback(false);
                    } else {
                        setProducts(ALL_SKUS.map(s => ({ ...s, status: 'Normal' })));
                        setIsFallback(true);
                    }
                    break;
                }
                case 'SUPER_DIST': {
                    const data = await getMasterSuperDistributors();
                    if (data.length > 0) {
                        setSuperDists(data);
                        setIsFallback(false);
                    } else {
                        const superDistNames = Array.from(new Set(MASTER_STORES.map(s => s.superDistributor)));
                        setSuperDists(superDistNames.map((name) => ({ id: `fallback-sd-${name}`, name })));
                        setIsFallback(true);
                    }
                    break;
                }
                case 'DIST': {
                    const [d, sd] = await Promise.all([getMasterDistributors(), getMasterSuperDistributors()]);
                    if (d.length > 0) {
                        setDists(d);
                        setSuperDists(sd);
                        setIsFallback(false);
                    } else {
                        const distInfo = Array.from(new Set(MASTER_STORES.map(s => JSON.stringify({ 
                            name: s.distributor.trim(), 
                            superDistName: s.superDistributor, 
                            region: s.region 
                        }))));
                        const superDistNames = Array.from(new Set(MASTER_STORES.map(s => s.superDistributor)));
                        
                        setSuperDists(superDistNames.map((name) => ({ id: `fallback-sd-${name}`, name })));
                        setDists(distInfo.map((info) => {
                            const d = JSON.parse(info);
                            return { 
                                id: `fallback-d-${d.name}`, 
                                name: d.name, 
                                region: d.region, 
                                superDistributorId: `fallback-sd-${d.superDistName}` 
                            };
                        }));
                        setIsFallback(true);
                    }
                    break;
                }
                case 'STORE': {
                    const [s, d] = await Promise.all([getMasterStores(), getMasterDistributors()]);
                    if (s.length > 0) {
                        setStores(s);
                        setDists(d);
                        setIsFallback(false);
                    } else {
                        setStores(MASTER_STORES.map(st => ({ 
                            id: st.id, 
                            name: st.name, 
                            region: st.region, 
                            distributorId: `fallback-d-${st.distributor.trim()}` 
                        })));
                        const distInfo = Array.from(new Set(MASTER_STORES.map(s => JSON.stringify({ 
                            name: s.distributor.trim(), 
                            superDistName: s.superDistributor, 
                            region: s.region 
                        }))));
                        setDists(distInfo.map((info) => {
                            const d = JSON.parse(info);
                            return { id: `fallback-d-${d.name}`, name: d.name, region: d.region, superDistributorId: `fallback-sd-${d.superDistName}` };
                        }));
                        const superDistNames = Array.from(new Set(MASTER_STORES.map(s => s.superDistributor)));
                        setSuperDists(superDistNames.map((name) => ({ id: `fallback-sd-${name}`, name })));
                        setIsFallback(true);
                    }
                    break;
                }
            }
        } catch (e) {
            console.error("Failed to load master data", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleInitialize = async () => {
        if (!confirm("This will load the default list of BDEs, Products, and Stores into the database. Continue?")) return;
        setLoading(true);
        try {
            const superDistNames = Array.from(new Set(MASTER_STORES.map(s => s.superDistributor)));
            const distInfo = Array.from(new Set(MASTER_STORES.map(s => JSON.stringify({ 
                name: s.distributor.trim(), 
                superDistName: s.superDistributor, 
                region: s.region 
            }))));

            const seedData = {
                bdes: BDE_DETAILS,
                products: ALL_SKUS.map(s => ({ ...s, status: 'Normal' })),
                superDists: superDistNames.map(name => ({ name })),
                dists: distInfo.map(info => JSON.parse(info)),
                stores: MASTER_STORES.map(s => ({
                    id: s.id,
                    name: s.name,
                    region: s.region,
                    distributorName: s.distributor.trim()
                }))
            };

            await initializeMasterData(seedData);
            alert("Default data loaded successfully!");
            loadData();
        } catch (e) {
            console.error(e);
            alert("Failed to load data. Please check your connection.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm("CRITICAL: This will delete ALL master data from the database. This cannot be undone. Continue?")) return;
        setLoading(true);
        try {
            await clearMasterData();
            alert("All master data cleared successfully.");
            loadData();
        } catch (e) {
            console.error(e);
            alert("Failed to clear data.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            let success = false;
            // If it's a new item OR we are editing a fallback item (which isn't in DB yet)
            if (editingId === 'new' || (typeof editingId === 'string' && editingId.startsWith('fallback-'))) {
                const { id, ...dataToSave } = editData;
                switch (activeTab) {
                    case 'BDE': success = !!(await saveMasterBde(dataToSave)); break;
                    case 'PRODUCT': success = !!(await saveMasterProduct(editData)); break;
                    case 'SUPER_DIST': success = !!(await saveMasterSuperDistributor(dataToSave)); break;
                    case 'DIST': success = !!(await saveMasterDistributor(dataToSave)); break;
                    case 'STORE': success = !!(await saveMasterStore(editData)); break;
                }
            } else if (editingId) {
                switch (activeTab) {
                    case 'BDE': success = await updateMasterBde(editingId, editData); break;
                    case 'PRODUCT': success = await updateMasterProduct(editingId, editData); break;
                    case 'SUPER_DIST': success = await updateMasterSuperDistributor(editingId, editData); break;
                    case 'DIST': success = await updateMasterDistributor(editingId, editData); break;
                    case 'STORE': success = await updateMasterStore(editingId, editData); break;
                }
            }
            if (success) {
                setEditingId(null);
                loadData();
            }
        } catch (e) {
            console.error("Failed to save", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this master record?")) return;
        setLoading(true);
        try {
            let success = false;
            switch (activeTab) {
                case 'BDE': success = await deleteMasterBde(id); break;
                case 'PRODUCT': success = await deleteMasterProduct(id); break;
                case 'SUPER_DIST': success = await deleteMasterSuperDistributor(id); break;
                case 'DIST': success = await deleteMasterDistributor(id); break;
                case 'STORE': success = await deleteMasterStore(id); break;
            }
            if (success) loadData();
        } catch (e) {
            console.error("Failed to delete", e);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (item: any) => {
        setEditingId(item.id);
        setEditData({ ...item });
    };

    const startAdd = () => {
        setEditingId('new');
        setEditData({});
    };

    const handleExport = () => {
        let dataToExport: any[] = [];
        let fileName = `Master_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`;

        switch (activeTab) {
            case 'BDE': dataToExport = bdes; break;
            case 'PRODUCT': dataToExport = products; break;
            case 'SUPER_DIST': dataToExport = superDists; break;
            case 'DIST': dataToExport = dists; break;
            case 'STORE': dataToExport = stores; break;
        }

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab);
        XLSX.writeFile(wb, fileName);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (!confirm(`Import ${data.length} records into ${activeTab}? This will add to existing data.`)) return;

                setLoading(true);
                let successCount = 0;
                for (const item of data) {
                    try {
                        switch (activeTab) {
                            case 'BDE': await saveMasterBde(item); break;
                            case 'PRODUCT': await saveMasterProduct(item); break;
                            case 'SUPER_DIST': await saveMasterSuperDistributor(item); break;
                            case 'DIST': await saveMasterDistributor(item); break;
                            case 'STORE': await saveMasterStore(item); break;
                        }
                        successCount++;
                    } catch (err) {
                        console.error("Failed to import item", item, err);
                    }
                }
                alert(`Successfully imported ${successCount} out of ${data.length} records.`);
                loadData();
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to parse Excel file.");
            } finally {
                setLoading(false);
                e.target.value = '';
            }
        };
        reader.readAsBinaryString(file);
    };

    const renderTable = () => {
        switch (activeTab) {
            case 'BDE':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Region</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editingId === 'new' && (
                                <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="BDE Name" /></td>
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.region || ''} onChange={e => setEditData({...editData, region: e.target.value})} placeholder="Region" /></td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {bdes.map(b => (
                                <tr key={b.id}>
                                    <td className="px-6 py-3">
                                        {editingId === b.id ? <input className="w-full p-2 border rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /> : b.name}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === b.id ? <input className="w-full p-2 border rounded" value={editData.region} onChange={e => setEditData({...editData, region: e.target.value})} /> : b.region}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === b.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => startEdit(b)} 
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(b.id!)} 
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'SUPER_DIST':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editingId === 'new' && (
                                <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Super Dist Name" /></td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {superDists.map(sd => (
                                <tr key={sd.id}>
                                    <td className="px-6 py-3">
                                        {editingId === sd.id ? <input className="w-full p-2 border rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /> : sd.name}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === sd.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(sd)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(sd.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'DIST':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Region</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Super Distributor</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editingId === 'new' && (
                                <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Dist Name" /></td>
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.region || ''} onChange={e => setEditData({...editData, region: e.target.value})} placeholder="Region" /></td>
                                    <td className="px-6 py-3">
                                        <select className="w-full p-2 border rounded" value={editData.superDistributorId || ''} onChange={e => setEditData({...editData, superDistributorId: e.target.value})}>
                                            <option value="">Select Super Dist</option>
                                            {superDists.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {dists.map(d => (
                                <tr key={d.id}>
                                    <td className="px-6 py-3">
                                        {editingId === d.id ? <input className="w-full p-2 border rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /> : d.name}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === d.id ? <input className="w-full p-2 border rounded" value={editData.region} onChange={e => setEditData({...editData, region: e.target.value})} /> : d.region}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === d.id ? (
                                            <select className="w-full p-2 border rounded" value={editData.superDistributorId} onChange={e => setEditData({...editData, superDistributorId: e.target.value})}>
                                                {superDists.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                                            </select>
                                        ) : superDists.find(sd => sd.id === d.superDistributorId)?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === d.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(d)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Edit"><Edit2 size={18} /></button>
                                                    <button onClick={() => handleDelete(d.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={18} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'PRODUCT':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">SKU Code</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Type</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editingId === 'new' && (
                                <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.id || ''} onChange={e => setEditData({...editData, id: e.target.value.toUpperCase()})} placeholder="Code" /></td>
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Name" /></td>
                                    <td className="px-6 py-3">
                                        <select className="w-full p-2 border rounded" value={editData.category || ''} onChange={e => setEditData({...editData, category: e.target.value})}>
                                            <option value="">Select</option>
                                            <option value="Hair">Hair</option>
                                            <option value="Skin">Skin</option>
                                            <option value="Body">Body</option>
                                            <option value="Gifting">Gifting</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3">
                                        <select className="w-full p-2 border rounded" value={editData.type || ''} onChange={e => setEditData({...editData, type: e.target.value})}>
                                            <option value="">Select</option>
                                            <option value="Natural">Natural</option>
                                            <option value="Professional">Professional</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {products.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-3 font-mono text-xs">{p.id}</td>
                                    <td className="px-6 py-3">
                                        {editingId === p.id ? <input className="w-full p-2 border rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /> : p.name}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === p.id ? (
                                            <select className="w-full p-2 border rounded" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
                                                <option value="Hair">Hair</option>
                                                <option value="Skin">Skin</option>
                                                <option value="Body">Body</option>
                                                <option value="Gifting">Gifting</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        ) : p.category}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === p.id ? (
                                            <select className="w-full p-2 border rounded" value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})}>
                                                <option value="Natural">Natural</option>
                                                <option value="Professional">Professional</option>
                                            </select>
                                        ) : p.type}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === p.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => startEdit(p)} 
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(p.id)} 
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            case 'STORE':
                return (
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">BSRN</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Region</th>
                                <th className="px-6 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Distributor</th>
                                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                            {editingId === 'new' && (
                                <tr className="bg-indigo-50/30">
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.id || ''} onChange={e => setEditData({...editData, id: e.target.value})} placeholder="BSRN" /></td>
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.name || ''} onChange={e => setEditData({...editData, name: e.target.value})} placeholder="Store Name" /></td>
                                    <td className="px-6 py-3"><input className="w-full p-2 border rounded" value={editData.region || ''} onChange={e => setEditData({...editData, region: e.target.value})} placeholder="Region" /></td>
                                    <td className="px-6 py-3">
                                        <select className="w-full p-2 border rounded" value={editData.distributorId || ''} onChange={e => setEditData({...editData, distributorId: e.target.value})}>
                                            <option value="">Select Dist</option>
                                            {dists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                            <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {stores.map(s => (
                                <tr key={s.id}>
                                    <td className="px-6 py-3 font-mono text-xs">{s.id}</td>
                                    <td className="px-6 py-3">
                                        {editingId === s.id ? <input className="w-full p-2 border rounded" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /> : s.name}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === s.id ? <input className="w-full p-2 border rounded" value={editData.region} onChange={e => setEditData({...editData, region: e.target.value})} /> : s.region}
                                    </td>
                                    <td className="px-6 py-3">
                                        {editingId === s.id ? (
                                            <select className="w-full p-2 border rounded" value={editData.distributorId} onChange={e => setEditData({...editData, distributorId: e.target.value})}>
                                                {dists.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        ) : dists.find(d => d.id === s.distributorId)?.name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {editingId === s.id ? (
                                                <>
                                                    <button onClick={handleSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Save size={18} /></button>
                                                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => startEdit(s)} 
                                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(s.id)} 
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                );
            default:
                return <div className="p-10 text-center text-slate-400">Select a tab to manage master data.</div>;
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
                        <Package size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">Master Data Management</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Configure dynamic app data</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                        <Button 
                            variant="secondary" 
                            onClick={handleExport}
                            className="flex items-center gap-2 !bg-white !shadow-sm !py-2"
                            title="Export to Excel"
                        >
                            <Download size={16} />
                            <span className="hidden sm:inline">Export</span>
                        </Button>
                        <label className="cursor-pointer">
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                            <div className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 rounded-lg shadow-sm hover:bg-slate-50 transition-all text-xs font-bold">
                                <Upload size={16} />
                                <span className="hidden sm:inline">Import</span>
                            </div>
                        </label>
                    </div>
                    <Button 
                        variant="secondary" 
                        onClick={handleInitialize} 
                        disabled={loading}
                        className="flex items-center gap-2"
                    >
                        <Database size={16} />
                        <span className="hidden sm:inline">Import Default</span>
                    </Button>
                    <Button 
                        variant="secondary" 
                        onClick={handleClearAll} 
                        disabled={loading}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 size={16} />
                        <span className="hidden sm:inline">Delete All</span>
                    </Button>
                    <Button onClick={startAdd} className="flex items-center gap-2">
                        <Plus size={18} /> <span className="hidden sm:inline">Add New</span>
                    </Button>
                </div>
            </div>

            <div className="flex border-b border-slate-100 overflow-x-auto no-scrollbar">
                {[
                    { id: 'BDE', label: 'BDEs', icon: Users },
                    { id: 'PRODUCT', label: 'Products', icon: Package },
                    { id: 'SUPER_DIST', label: 'Super Dists', icon: ShieldCheck },
                    { id: 'DIST', label: 'Distributors', icon: MapPin },
                    { id: 'STORE', label: 'Stores', icon: StoreIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as MasterTab)}
                        className={`px-6 py-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {isFallback && (
                <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-center gap-3">
                    <Database size={16} className="text-amber-600" />
                    <p className="text-xs text-amber-700 font-medium">
                        Showing default list. Click <strong>"Import Default List"</strong> to save these to the database so you can edit them permanently.
                    </p>
                </div>
            )}

            <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text"
                        placeholder={`Search ${activeTab.toLowerCase()}s...`}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                {loading ? (
                    <div className="p-20 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                    </div>
                ) : renderTable()}
            </div>
        </div>
    );
};
