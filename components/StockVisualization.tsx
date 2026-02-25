import React, { useMemo, useState } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
    LayoutDashboard, Store, Truck, ShieldCheck, TrendingUp, Package, 
    ChevronRight, Info, Filter, ArrowLeft, Search, Layers, AlertTriangle,
    CheckCircle2, BarChart3, List
} from 'lucide-react';
import type { DbSubmission, DistributorMapping, Sku } from '../types';
import { ALL_SKUS, MASTER_STORES } from '../constants';

interface StockVisualizationProps {
    submissions: DbSubmission[];
    mappings: DistributorMapping[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

// 4. Custom Tooltip for KPI Cards
const KPITooltip = ({ title, info }: { title: string, info: string }) => (
    <div className="group relative inline-block ml-1">
        <Info size={12} className="text-slate-400 cursor-help" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50">
            <p className="font-bold mb-1">{title}</p>
            <p className="opacity-80">{info}</p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
        </div>
    </div>
);

export const StockVisualization: React.FC<StockVisualizationProps> = ({ submissions, mappings }) => {
    // 1. State for Drill-down and Filtering
    const [drillDown, setDrillDown] = useState<{ level: 'ALL' | 'SUPER' | 'DIST', id: string | null }>({ level: 'ALL', id: null });
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'VISUAL' | 'TABLE'>('VISUAL');

    // 2. Data Aggregation (Latest Submission per Store)
    const processedData = useMemo(() => {
        const mappingMap = new Map<string, DistributorMapping>();
        mappings.forEach(m => mappingMap.set(m.storeId, m));
        
        const legacyMap = new Map<string, any>();
        MASTER_STORES.forEach(s => legacyMap.set(s.id, s));

        // Latest submission per store
        const latestSubmissionsMap = new Map<string, DbSubmission>();
        submissions.forEach(sub => {
            const existing = latestSubmissionsMap.get(sub.storeId);
            const subTime = sub.timestamp?.seconds || 0;
            const existingTime = existing?.timestamp?.seconds || 0;
            if (!existing || subTime > existingTime) {
                latestSubmissionsMap.set(sub.storeId, sub);
            }
        });
        
        const latestSubmissions = Array.from(latestSubmissionsMap.values());

        // Build Hierarchy
        const hierarchy: Record<string, { 
            name: string, 
            total: number, 
            lastUpdated: number,
            categories: Record<string, number>,
            distributors: Record<string, {
                name: string,
                total: number,
                categories: Record<string, number>,
                stores: Array<{ name: string, id: string, total: number, region: string, lastUpdated: number, role: string, stockData: any }>
            }>
        }> = {};

        latestSubmissions.forEach(sub => {
            const mapping = mappingMap.get(sub.storeId) || legacyMap.get(sub.storeId);
            const sDist = mapping?.superDistributor || 'Unknown Super Dist';
            const dist = mapping?.distributor || 'Unknown Dist';
            const subTime = sub.timestamp?.seconds || 0;

            if (!hierarchy[sDist]) {
                hierarchy[sDist] = { name: sDist, total: 0, lastUpdated: 0, categories: {}, distributors: {} };
            }
            if (!hierarchy[sDist].distributors[dist]) {
                hierarchy[sDist].distributors[dist] = { name: dist, total: 0, categories: {}, stores: [] };
            }

            // Update Totals
            hierarchy[sDist].total += sub.totalQty;
            hierarchy[sDist].distributors[dist].total += sub.totalQty;
            if (subTime > hierarchy[sDist].lastUpdated) hierarchy[sDist].lastUpdated = subTime;

            // Update Categories
            Object.entries(sub.stockData).forEach(([skuId, entry]) => {
                const sku = ALL_SKUS.find(s => s.id === skuId);
                const cat = sku?.category || 'Other';
                const qty = entry.batches?.reduce((sum, b) => sum + (Number(b.qty) || 0), 0) || 0;
                
                hierarchy[sDist].categories[cat] = (hierarchy[sDist].categories[cat] || 0) + qty;
                hierarchy[sDist].distributors[dist].categories[cat] = (hierarchy[sDist].distributors[dist].categories[cat] || 0) + qty;
            });

            // Add Store
            hierarchy[sDist].distributors[dist].stores.push({
                name: sub.storeName,
                id: sub.storeId,
                total: sub.totalQty,
                region: sub.region,
                lastUpdated: subTime,
                role: sub.role,
                stockData: sub.stockData
            });
        });

        return { hierarchy, latestSubmissions };
    }, [submissions, mappings]);

    // 3. Derived Stats based on Drill-down and Filters
    const stats = useMemo(() => {
        const { hierarchy } = processedData;
        let superDistData: any[] = [];
        let distData: any[] = [];
        let storeData: any[] = [];
        let categoryData: any[] = [];
        let totalSoh = 0;
        let activeStores = 0;

        if (drillDown.level === 'ALL') {
            Object.values(hierarchy).forEach(sd => {
                superDistData.push({ name: sd.name, value: sd.total, lastUpdated: sd.lastUpdated });
                totalSoh += sd.total;
                Object.values(sd.distributors).forEach(d => {
                    activeStores += d.stores.length;
                    Object.entries(d.categories).forEach(([cat, val]) => {
                        if (filterCategory === 'All' || filterCategory === cat) {
                            const existing = categoryData.find(c => c.name === cat);
                            if (existing) existing.value += val;
                            else categoryData.push({ name: cat, value: val });
                        }
                    });
                });
            });
        } else if (drillDown.level === 'SUPER') {
            const sd = hierarchy[drillDown.id!];
            if (sd) {
                totalSoh = sd.total;
                Object.values(sd.distributors).forEach(d => {
                    distData.push({ name: d.name, value: d.total });
                    activeStores += d.stores.length;
                    Object.entries(d.categories).forEach(([cat, val]) => {
                        if (filterCategory === 'All' || filterCategory === cat) {
                            const existing = categoryData.find(c => c.name === cat);
                            if (existing) existing.value += val;
                            else categoryData.push({ name: cat, value: val });
                        }
                    });
                });
            }
        } else if (drillDown.level === 'DIST') {
            let targetDist: any = null;
            Object.values(hierarchy).forEach(sd => {
                if (sd.distributors[drillDown.id!]) targetDist = sd.distributors[drillDown.id!];
            });

            if (targetDist) {
                totalSoh = targetDist.total;
                activeStores = targetDist.stores.length;
                storeData = targetDist.stores.map(s => ({ 
                    name: s.name, 
                    value: s.total, 
                    region: s.region, 
                    id: s.id,
                    categories: Object.entries(s.stockData).reduce((acc, [skuId, entry]: [string, any]) => {
                        const sku = ALL_SKUS.find(sk => sk.id === skuId);
                        const cat = sku?.category || 'Other';
                        const qty = entry.batches?.reduce((sum: number, b: any) => sum + (Number(b.qty) || 0), 0) || 0;
                        acc[cat] = (acc[cat] || 0) + qty;
                        return acc;
                    }, {} as Record<string, number>)
                }));
                Object.entries(targetDist.categories).forEach(([cat, val]) => {
                    if (filterCategory === 'All' || filterCategory === cat) {
                        categoryData.push({ name: cat, value: val });
                    }
                });
            }
        }

        return {
            totalSoh,
            activeStores,
            superDistData: superDistData.sort((a, b) => b.value - a.value),
            distData: distData.sort((a, b) => b.value - a.value),
            storeData: storeData.sort((a, b) => b.value - a.value),
            categoryData: categoryData.sort((a, b) => b.value - a.value),
            totalSuperDists: Object.keys(hierarchy).length
        };
    }, [processedData, drillDown, filterCategory]);

    // 5. Identify Critical Stores (Low Stock)
    const criticalStores = useMemo(() => {
        const stores: any[] = [];
        Object.values(processedData.hierarchy).forEach(sd => {
            Object.values(sd.distributors).forEach(d => {
                d.stores.forEach(s => {
                    if (s.total < 10) {
                        stores.push({ ...s, superDist: sd.name, dist: d.name });
                    }
                });
            });
        });
        return stores.sort((a, b) => a.total - b.total).slice(0, 8);
    }, [processedData]);

    // Helper to get stock status color
    const getStockColor = (val: number) => {
        if (val < 10) return 'text-red-700 bg-red-50 border-red-200';
        if (val < 50) return 'text-amber-700 bg-amber-50 border-amber-200';
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Critical Alerts - Only shown at Global Level */}
            {drillDown.level === 'ALL' && criticalStores.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-[2.5rem] p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                             <h3 className="font-bold text-red-900 text-sm">Critical Stock Alerts</h3>
                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Stores with less than 10 units</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {criticalStores.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-2xl border border-red-100 shadow-sm flex justify-between items-center">
                                <div className="min-w-0">
                                    <h4 className="text-[10px] font-bold text-slate-800 truncate">{s.name}</h4>
                                    <p className="text-[8px] text-slate-400 font-bold truncate">{s.dist}</p>
                                </div>
                                <div className="text-right ml-2">
                                    <span className="text-sm font-bold text-red-600">{s.total}</span>
                                    <p className="text-[8px] text-red-400 font-bold">Units</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Navigation & Filters */}
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {drillDown.level !== 'ALL' && (
                        <button 
                            onClick={() => setDrillDown(prev => ({ level: prev.level === 'DIST' ? 'SUPER' : 'ALL', id: null }))}
                            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-600 transition-all border border-slate-200"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                            <span className="cursor-pointer hover:text-indigo-600" onClick={() => setDrillDown({ level: 'ALL', id: null })}>Global</span>
                            {drillDown.level !== 'ALL' && (
                                <>
                                    <ChevronRight size={10} />
                                    <span className="cursor-pointer hover:text-indigo-600" onClick={() => setDrillDown({ level: 'SUPER', id: drillDown.id })}>
                                        {drillDown.id}
                                    </span>
                                </>
                            )}
                        </div>
                        <h3 className="font-bold text-slate-800 text-xl leading-tight">
                            {drillDown.level === 'ALL' ? 'Inventory Overview' : 
                             drillDown.level === 'SUPER' ? `Region: ${drillDown.id}` : 
                             `Node: ${drillDown.id}`}
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
                        <button 
                            onClick={() => setViewMode('VISUAL')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'VISUAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <BarChart3 size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('TABLE')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'TABLE' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select 
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                        >
                            {['All', ...ALL_SKUS.reduce((acc, sku) => acc.includes(sku.category) ? acc : [...acc, sku.category], [] as string[])].map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">Live Stock on Hand</p>
                            <KPITooltip title="Live Inventory" info="Aggregated SOH from the most recent BDE/BA submissions per store." />
                        </div>
                        <div className="flex items-baseline gap-3">
                            <h3 className="text-5xl font-bold tracking-tighter">{stats.totalSoh.toLocaleString()}</h3>
                            <span className="text-indigo-400 font-bold text-sm">Units</span>
                        </div>
                        <div className="mt-6 flex items-center gap-4">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                                <TrendingUp size={12} className="text-indigo-400" />
                                <span>Real-time Sync</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-[10px] font-bold">
                                <CheckCircle2 size={12} className="text-emerald-400" />
                                <span>{stats.activeStores} Nodes Active</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
                </div>
                
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-indigo-200 transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                        <div className="p-4 bg-indigo-50 rounded-3xl text-indigo-600 w-fit mb-4 group-hover:scale-110 transition-transform">
                            <Store size={28} />
                        </div>
                        <KPITooltip title="Active Stores" info="Total unique stores currently tracked in the system." />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.activeStores}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stores Tracked</p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-indigo-200 transition-all hover:shadow-md">
                    <div className="flex justify-between items-start">
                        <div className="p-4 bg-amber-50 rounded-3xl text-amber-600 w-fit mb-4 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={28} />
                        </div>
                        <KPITooltip title="Super Nodes" info="Top-level distribution hubs managing the network." />
                    </div>
                    <div>
                        <h3 className="text-3xl font-bold text-slate-800 tracking-tight">{stats.totalSuperDists}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Super Nodes</p>
                    </div>
                </div>
            </div>

            {/* Visual Content */}
            {viewMode === 'VISUAL' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Visualization Area */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Hierarchy View */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <Layers size={20} />
                                    </div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        {drillDown.level === 'ALL' ? 'Super Distributor Network' : 
                                         drillDown.level === 'SUPER' ? 'Distributor Breakdown' : 
                                         'Store Inventory Status'}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-full uppercase tracking-widest">
                                        {drillDown.level === 'DIST' ? 'Store Tiles' : 'Click Bar to Drill'}
                                    </span>
                                </div>
                            </div>

                            {drillDown.level === 'DIST' ? (
                                /* Store Grid View - Solves visibility for low SOH stores */
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {stats.storeData.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((store) => (
                                        <div key={store.id} className={`p-4 rounded-3xl border transition-all hover:shadow-md group ${getStockColor(store.value)}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="w-8 h-8 rounded-xl bg-white/50 flex items-center justify-center">
                                                    <Store size={14} />
                                                </div>
                                                {store.value < 10 && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                            </div>
                                            <h4 className="text-[11px] font-bold leading-tight mb-1 line-clamp-2 h-8">{store.name}</h4>
                                            <div className="flex items-baseline gap-1 mt-auto">
                                                <span className="text-lg font-bold">{store.value}</span>
                                                <span className="text-[9px] font-bold opacity-60">Units</span>
                                            </div>
                                            {/* Mini category breakdown sparkline */}
                                            <div className="mt-3 flex h-1.5 rounded-full overflow-hidden bg-black/5">
                                                {Object.entries(store.categories || {}).map(([cat, val], i) => (
                                                    <div 
                                                        key={cat} 
                                                        style={{ width: `${(val / store.value) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                                                        title={`${cat}: ${val} units`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Bar Chart for Higher Levels */
                                <div className="h-[400px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={drillDown.level === 'ALL' ? stats.superDistData : stats.distData} 
                                            layout="vertical" 
                                            margin={{ left: 40, right: 40 }}
                                            onClick={(data) => {
                                                if (data && data.activeLabel) {
                                                    if (drillDown.level === 'ALL') setDrillDown({ level: 'SUPER', id: data.activeLabel });
                                                    else if (drillDown.level === 'SUPER') setDrillDown({ level: 'DIST', id: data.activeLabel });
                                                }
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis 
                                                dataKey="name" 
                                                type="category" 
                                                width={140} 
                                                tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip 
                                                cursor={{ fill: '#f8fafc', radius: 12 }}
                                                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                                                formatter={(value: number) => [`${value.toLocaleString()} Units`, 'Stock']}
                                            />
                                            <Bar dataKey="value" fill="#6366f1" radius={[0, 16, 16, 0]} barSize={32} className="cursor-pointer" label={{ position: 'right', fill: '#64748b', fontSize: 10, fontWeight: 800 }}>
                                                {(drillDown.level === 'ALL' ? stats.superDistData : stats.distData).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Analytics */}
                    <div className="space-y-6">
                        {/* Category Mix */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2.5 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <LayoutDashboard size={20} />
                                </div>
                                <h3 className="font-bold text-slate-800 text-lg">Category Mix</h3>
                            </div>
                            <div className="h-[300px] w-full flex flex-col">
                                <ResponsiveContainer width="100%" height="220">
                                    <PieChart>
                                        <Pie
                                            data={stats.categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={75}
                                            outerRadius={95}
                                            paddingAngle={10}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stats.categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-8 space-y-3 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar">
                                    {stats.categoryData.map((cat, i) => (
                                        <div key={cat.name} className="flex items-center justify-between text-sm p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                                <span className="text-slate-600 font-black text-xs">{cat.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-slate-800 font-black">{cat.value.toLocaleString()}</span>
                                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                                    {((cat.value / stats.totalSoh) * 100).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* Table View - Node Explorer */
                <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-2xl text-white">
                                <Truck size={20} />
                            </div>
                            <div>
                                <h3 className="font-black text-slate-800">Node Explorer</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Full Network Hierarchy</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Hierarchy Path</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Region</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Sync</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">SOH Units</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.values(processedData.hierarchy)
                                    .filter(sd => drillDown.level === 'ALL' || sd.name === drillDown.id || (drillDown.level === 'DIST' && Object.keys(sd.distributors).includes(drillDown.id!)))
                                    .map(sd => (
                                        <React.Fragment key={sd.name}>
                                            <tr className="hover:bg-indigo-50/30 transition-all group cursor-pointer" onClick={() => setDrillDown({ level: 'SUPER', id: sd.name })}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs shadow-sm">SD</div>
                                                        <span className="font-black text-slate-700">{sd.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-[10px] text-slate-400 font-black uppercase tracking-widest">Multi-Region</td>
                                                <td className="px-8 py-5 text-xs text-slate-400 font-bold">
                                                    {new Date(sd.lastUpdated * 1000).toLocaleDateString()}
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm border border-indigo-100">
                                                        {sd.total.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                            
                                            {(drillDown.level === 'SUPER' || drillDown.level === 'DIST') && Object.values(sd.distributors)
                                                .filter(d => drillDown.level === 'SUPER' || d.name === drillDown.id)
                                                .map(d => (
                                                <React.Fragment key={d.name}>
                                                    <tr className="bg-slate-50/30 hover:bg-emerald-50/30 transition-all group cursor-pointer" onClick={() => setDrillDown({ level: 'DIST', id: d.name })}>
                                                        <td className="px-8 py-5 pl-20">
                                                            <div className="flex items-center gap-4">
                                                                <ChevronRight size={16} className="text-slate-300" />
                                                                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-[10px] shadow-sm">D</div>
                                                                <span className="font-black text-slate-600 text-sm">{d.name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-5 text-[10px] text-slate-400 font-black uppercase tracking-widest">Network Node</td>
                                                        <td className="px-8 py-5 text-xs text-slate-400 font-bold">--</td>
                                                        <td className="px-8 py-5 text-right">
                                                            <span className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-xs border border-emerald-100">
                                                                {d.total.toLocaleString()}
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {drillDown.level === 'DIST' && d.name === drillDown.id && d.stores.map(s => (
                                                        <tr key={s.id} className="bg-white hover:bg-amber-50/30 transition-all">
                                                            <td className="px-8 py-5 pl-32">
                                                                <div className="flex items-center gap-4">
                                                                    <ChevronRight size={14} className="text-slate-200" />
                                                                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-black text-[9px] shadow-sm">S</div>
                                                                    <div>
                                                                        <p className="font-black text-slate-500 text-xs">{s.name}</p>
                                                                        <p className="text-[9px] text-slate-300 font-black uppercase tracking-tighter">{s.id}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.region}</span>
                                                            </td>
                                                            <td className="px-8 py-5 text-[10px] text-slate-400 font-black">
                                                                {new Date(s.lastUpdated * 1000).toLocaleDateString()}
                                                                <span className="ml-3 px-2 py-1 bg-slate-100 rounded-lg text-[8px] font-black">{s.role}</span>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <span className={`px-3 py-1.5 rounded-xl font-black text-xs border ${getStockColor(s.total)}`}>
                                                                    {s.total.toLocaleString()}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </React.Fragment>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}} />
        </div>
    );
};
