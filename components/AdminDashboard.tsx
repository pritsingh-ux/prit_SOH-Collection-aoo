// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { getAllSubmissions, deleteSubmissionFromCloud } from '../services/firebaseConfig';
import { generateShareCode } from '../services/shareService';
import type { DbSubmission, Sku, Store, StockData } from '../types';
import { ALL_SKUS } from '../constants';

declare const XLSX: any; // SheetJS

interface AdminDashboardProps {
    onLogout: () => void;
}

// Helper to safely format dates regardless of what Firebase sends back
const formatDate = (sub: DbSubmission): string => {
    try {
        if (sub.timestamp && typeof sub.timestamp.toDate === 'function') {
            return sub.timestamp.toDate().toLocaleDateString();
        }
        if (sub.dateString) return sub.dateString;
        return 'Unknown Date';
    } catch (e) {
        return 'Invalid Date';
    }
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
    const [submissions, setSubmissions] = useState<DbSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Filtering State
    const [filterRole, setFilterRole] = useState<'ALL' | 'BDE' | 'BA'>('ALL');
    
    // Copy Feedback State
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    // Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{isOpen: boolean, docId: string | null, isDeleting: boolean}>({isOpen: false, docId: null, isDeleting: false});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getAllSubmissions();
            
            // Client-side sorting (Newest first)
            data.sort((a, b) => {
                const timeA = a.timestamp?.seconds || 0;
                const timeB = b.timestamp?.seconds || 0;
                return timeB - timeA;
            });

            setSubmissions(data);
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadAll = () => {
        if (submissions.length === 0) {
            alert("No data to export");
            return;
        }

        const skuMap = new Map(ALL_SKUS.map(s => [s.id, s]));
        const allRows: any[] = [];

        const dataToExport = submissions.filter(sub => {
            if (filterRole === 'ALL') return true;
            return sub.role === filterRole;
        });

        dataToExport.forEach(sub => {
            const dateStr = formatDate(sub);
            
            Object.entries(sub.stockData).forEach(([skuId, count]) => {
                if ((count as number) > 0) {
                    const sku = skuMap.get(skuId);
                    allRows.push({
                        'Date': dateStr,
                        'BDE Name': sub.bdeName,
                        'Region': sub.region,
                        'Role': sub.role,
                        'Store Name': sub.storeName,
                        'Store Id': sub.storeId,
                        'Product Code': skuId,
                        'Product Name': sku?.name || 'Custom/Unknown',
                        'Category': sku?.category || 'N/A',
                        'Qty': count
                    });
                }
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(allRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Master_Database');
        XLSX.writeFile(workbook, `Brillare_Master_SOH_${filterRole}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const handleCopyCode = (sub: DbSubmission) => {
        try {
            const tempStore: Store = {
                id: sub.storeId,
                name: sub.storeName,
                bsrn: sub.storeId
            };

            const stockMap: StockData = new Map(Object.entries(sub.stockData));
            const code = generateShareCode(tempStore, stockMap);
            
            navigator.clipboard.writeText(code).then(() => {
                setCopyFeedback(sub.auditId);
                setTimeout(() => setCopyFeedback(null), 2000);
            });
        } catch (e) {
            console.error("Failed to generate code", e);
            alert("Could not generate code for this entry.");
        }
    };

    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>, docId: string | undefined) => {
        e.preventDefault();
        e.stopPropagation(); // Stop click from bubbling
        
        if (!docId) {
            alert("Error: Cannot delete this item (Missing ID)");
            return;
        }
        setDeleteModal({ isOpen: true, docId, isDeleting: false });
    };

    const confirmDelete = async () => {
        if (deleteModal.docId) {
            setDeleteModal(prev => ({...prev, isDeleting: true}));
            const success = await deleteSubmissionFromCloud(deleteModal.docId);
            if (success) {
                setSubmissions(prev => prev.filter(s => s.docId !== deleteModal.docId));
                setDeleteModal({ isOpen: false, docId: null, isDeleting: false });
            } else {
                setDeleteModal(prev => ({...prev, isDeleting: false}));
            }
        }
    };

    const filteredSubmissions = submissions.filter(sub => {
        if (filterRole === 'ALL') return true;
        return sub.role === filterRole;
    });

    return (
        <div className="animate-fade-in pb-10">
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg mb-6 flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Master Database</h2>
                    <p className="text-slate-400">View and export all BDE submissions</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={loadData}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                    >
                        Refresh
                    </button>
                    <button 
                        onClick={onLogout}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r" role="alert">
                    <p className="font-bold">Database Error</p>
                    <p>{error}</p>
                    {error.includes('Permission') && (
                        <p className="text-sm mt-2">Please go to Firebase Console &rarr; Firestore Database &rarr; Rules and set <code>allow read, write: if true;</code></p>
                    )}
                </div>
            )}

            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
                    {(['ALL', 'BDE', 'BA'] as const).map(role => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                                filterRole === role 
                                    ? 'bg-indigo-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {role === 'ALL' ? 'All' : role === 'BDE' ? 'BDE Only' : 'BA Only'}
                        </button>
                    ))}
                </div>

                <button 
                    onClick={handleDownloadAll}
                    disabled={loading || !!error}
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export Current List
                </button>
            </div>

            {loading ? (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-slate-500">Connecting to Firebase...</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Submissions ({filteredSubmissions.length})</h3>
                        <span className="text-xs text-slate-400">Sorted by Date</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">BDE / Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Region</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Store</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Qty</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {filteredSubmissions.map((sub, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {formatDate(sub)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                            {sub.bdeName}
                                            {sub.role === 'BA' && <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700 font-bold">BA</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                            {sub.region}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                            {sub.storeName}
                                            <span className="block text-xs text-slate-400">{sub.storeId}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-600">
                                            {sub.totalQty}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCode(sub)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs px-3 py-1 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                                                    title="Generate Import Code"
                                                >
                                                    {copyFeedback === sub.auditId ? (
                                                        <span className="text-emerald-600 font-bold">Copied!</span>
                                                    ) : (
                                                        'Copy Code'
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => handleDeleteClick(e, sub.docId)}
                                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                    title="Delete Submission"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredSubmissions.length === 0 && !error && (
                        <div className="p-10 text-center text-slate-400">
                            {submissions.length === 0 ? "No data found in database yet." : "No results for this filter."}
                        </div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                        <div className="flex justify-center mb-4 text-red-100">
                                <div className="p-3 bg-red-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                </div>
                        </div>
                        <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Delete Submission?</h3>
                        <p className="text-sm text-center text-slate-500 mb-6">
                            This action cannot be undone. Are you sure you want to remove this entry from the database?
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setDeleteModal({isOpen: false, docId: null, isDeleting: false})}
                                disabled={deleteModal.isDeleting}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                disabled={deleteModal.isDeleting}
                                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 disabled:bg-red-400 flex justify-center items-center gap-2"
                            >
                                {deleteModal.isDeleting ? (
                                    <>
                                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                     Deleting...
                                    </>
                                ) : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};