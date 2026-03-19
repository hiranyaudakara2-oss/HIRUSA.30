/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, MapPin, Phone, Car, CreditCard, ArrowRight, LogOut, CheckCircle2, Tag, Fuel, Truck, Bike, QrCode, Trash2 } from 'lucide-react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  station: string;
}

interface UserData {
  fullName: string;
  address: string;
  phone: string;
  vehicleNumber: string;
  nic: string;
  vehicleCategory: string;
  userId?: string;
  customQuota?: number;
  transactions?: Transaction[];
  status?: string;
}

interface ReceiptInfo {
  v: string; // vehicle category
  q: number; // quota
  n: string; // vehicle number
  d: string; // date
}

export default function App() {
  const [view, setView] = useState<'form' | 'details' | 'admin-login' | 'admin-dashboard' | 'public-receipt'>('form');
  const [error, setError] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptInfo | null>(null);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<UserData>({
    fullName: '',
    address: '',
    phone: '',
    vehicleNumber: '',
    nic: '',
    vehicleCategory: '',
  });

  // Load current session from localStorage on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const receiptParam = params.get('receipt');
    if (receiptParam) {
      try {
        const decoded = JSON.parse(atob(receiptParam));
        setReceiptData(decoded);
        setView('public-receipt');
        return;
      } catch (e) {
        console.error('Failed to decode receipt', e);
      }
    }

    const currentNic = localStorage.getItem('current_user_nic');
    const users = JSON.parse(localStorage.getItem('all_vehicle_users') || '[]');
    setAllUsers(users);
    
    if (currentNic) {
      const currentUser = users.find((u: UserData) => u.nic === currentNic);
      if (currentUser) {
        setFormData(currentUser);
        setView('details');
      }
    }
  }, []);

  const handleAdminLogin = (e: FormEvent) => {
    e.preventDefault();
    if (adminPassword === '123') {
      setView('admin-dashboard');
      setAdminPassword('');
      setError(null);
    } else {
      setError('Invalid admin password');
    }
  };

  const updateCustomQuota = (nic: string, quota: number) => {
    const updated = allUsers.map(u => u.nic === nic ? { ...u, customQuota: quota } : u);
    setAllUsers(updated);
    localStorage.setItem('all_vehicle_users', JSON.stringify(updated));
    const updatedUser = updated.find(u => u.nic === nic);
    if (updatedUser) setSelectedUser(updatedUser);
  };

  const deleteUser = (nic: string) => {
    const updated = allUsers.filter(u => u.nic !== nic);
    setAllUsers(updated);
    localStorage.setItem('all_vehicle_users', JSON.stringify(updated));
    if (selectedUser?.nic === nic) setSelectedUser(null);
    setUserToDelete(null);
  };

  const markUserSuccess = (nic: string) => {
    const updated = allUsers.map(u => u.nic === nic ? { ...u, status: 'success' } : u);
    setAllUsers(updated);
    localStorage.setItem('all_vehicle_users', JSON.stringify(updated));
    
    if (selectedUser?.nic === nic) {
      setSelectedUser({ ...selectedUser, status: 'success' });
    }
  };

  const recordTransaction = (nic: string, amount: number) => {
    if (isNaN(amount) || amount <= 0) return;

    const updated = allUsers.map(u => {
      if (u.nic === nic) {
        const newTransaction: Transaction = {
          id: Math.random().toString(36).substr(2, 9).toUpperCase(),
          date: new Date().toLocaleString(),
          amount,
          station: 'Endana Pirawumhala'
        };
        const currentQuota = u.customQuota !== undefined ? u.customQuota : getQuota(u.vehicleCategory);
        return {
          ...u,
          customQuota: Math.max(0, currentQuota - amount),
          transactions: [newTransaction, ...(u.transactions || [])]
        };
      }
      return u;
    });

    setAllUsers(updated);
    localStorage.setItem('all_vehicle_users', JSON.stringify(updated));
    
    const updatedUser = updated.find(u => u.nic === nic);
    if (updatedUser) setSelectedUser(updatedUser);
    
    // Show success animation
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null); // Clear error when user types
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const users = JSON.parse(localStorage.getItem('all_vehicle_users') || '[]');
    
    // Check if NIC already exists
    const exists = users.some((u: UserData) => u.nic.toLowerCase() === formData.nic.toLowerCase());
    
    if (exists) {
      setError('An account with this ID number already exists.');
      return;
    }

    // Generate 5-digit User ID
    const userId = Math.floor(10000 + Math.random() * 90000).toString();
    const newUser = { ...formData, userId };

    // Save new user
    const updatedUsers = [...users, newUser];
    setAllUsers(updatedUsers);
    setFormData(newUser);
    localStorage.setItem('all_vehicle_users', JSON.stringify(updatedUsers));
    localStorage.setItem('current_user_nic', formData.nic);
    
    setView('details');
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('qr-code-canvas') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `Fuel_Receipt_${formData.vehicleNumber}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('current_user_nic');
    setFormData({
      fullName: '',
      address: '',
      phone: '',
      vehicleNumber: '',
      nic: '',
      vehicleCategory: '',
    });
    setError(null);
    setView('form');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100">
      <main className="max-w-4xl mx-auto px-4 py-12 md:py-20">
        <AnimatePresence mode="wait">
          {view === 'form' ? (
            <motion.div
              key="form-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-xl mx-auto"
            >
              <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 mb-6">
                  <Fuel size={32} />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-3">
                  Endana Pirawumhala
                </h1>
                <p className="text-slate-500 text-lg">
                  Fuel Management System Registration
                </p>
              </div>

              <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User size={16} className="text-indigo-500" />
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="address" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-500" />
                    Home Address
                  </label>
                  <textarea
                    required
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Main St, City, Country"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Phone size={16} className="text-indigo-500" />
                      Phone Number
                    </label>
                    <input
                      required
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 234 567 890"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="nic" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <CreditCard size={16} className="text-indigo-500" />
                      ID Number (NIC)
                    </label>
                    <input
                      required
                      type="text"
                      id="nic"
                      name="nic"
                      value={formData.nic}
                      onChange={handleInputChange}
                      placeholder="987654321V"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="vehicleNumber" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Car size={16} className="text-indigo-500" />
                      Vehicle Registration Number
                    </label>
                    <input
                      required
                      type="text"
                      id="vehicleNumber"
                      name="vehicleNumber"
                      value={formData.vehicleNumber}
                      onChange={handleInputChange}
                      placeholder="ABC-1234"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="vehicleCategory" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Tag size={16} className="text-indigo-500" />
                      Vehicle Category
                    </label>
                    <select
                      required
                      id="vehicleCategory"
                      name="vehicleCategory"
                      value={formData.vehicleCategory}
                      onChange={(e) => handleInputChange(e as any)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none bg-slate-50/50 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select Category</option>
                      <option value="Car">Car</option>
                      <option value="Motorbike">Motorbike</option>
                      <option value="Van">Van</option>
                      <option value="Bus">Bus</option>
                      <option value="Three-Wheeler">Three-Wheeler</option>
                      <option value="Lorry">Lorry</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group"
                >
                  Complete Registration
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={() => setView('admin-login')}
                  className="text-slate-400 hover:text-indigo-500 text-sm font-medium transition-colors"
                >
                  Admin Access
                </button>
              </div>
            </motion.div>
          ) : view === 'admin-login' ? (
            <motion.div
              key="admin-login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Admin Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Enter password"
                    />
                  </div>
                  <button className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Login</button>
                  <button 
                    type="button"
                    onClick={() => setView('form')}
                    className="w-full text-slate-400 text-sm"
                  >
                    Back to Registration
                  </button>
                </form>
              </div>
            </motion.div>
          ) : view === 'admin-dashboard' ? (
            <motion.div
              key="admin-dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 max-w-6xl mx-auto"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Endana Pirawumhala</h2>
                  <p className="text-slate-500 text-sm font-medium">Admin Management Portal</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <input 
                      type="text"
                      placeholder="Search User ID (e.g. 12345)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                    />
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                  <button 
                    onClick={() => {
                      setView('form');
                      setSelectedUser(null);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold text-sm px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                  >
                    <LogOut size={18} /> Logout
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="font-bold text-slate-700">Registered Users</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">User ID</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">User</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Vehicle</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Quota</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allUsers
                            .filter(u => u.userId?.includes(searchQuery) || u.nic.includes(searchQuery) || u.fullName.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(user => (
                            <tr 
                              key={user.nic} 
                              className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedUser?.nic === user.nic ? 'bg-indigo-50/50' : ''}`}
                              onClick={() => setSelectedUser(user)}
                            >
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm font-bold text-indigo-600">#{user.userId || '-----'}</span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900">{user.fullName}</p>
                                  {user.status === 'success' && (
                                    <span className="text-emerald-500 font-black text-[10px] tracking-widest animate-pulse">SUCCESS</span>
                                  )}
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user.nic}</p>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-semibold text-slate-700">{user.vehicleCategory}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user.vehicleNumber}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-black text-indigo-600">
                                  {user.customQuota !== undefined ? user.customQuota : getQuota(user.vehicleCategory)}L
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {user.status !== 'success' && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markUserSuccess(user.nic);
                                      }}
                                      className="bg-emerald-500 text-white px-3 py-1 rounded-lg font-black text-[10px] hover:bg-emerald-600 transition-all shadow-sm"
                                    >
                                      OK
                                    </button>
                                  )}
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setUserToDelete(user.nic);
                                    }}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {allUsers.length === 0 && (
                      <div className="p-12 text-center text-slate-400 font-medium">No registered users found.</div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  {selectedUser ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden sticky top-6"
                    >
                      <div className="bg-indigo-600 p-6 text-white">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest">User Profile</span>
                          <span className="font-mono font-bold text-xl">#{selectedUser.userId}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-2xl font-bold flex items-center gap-2">
                            {selectedUser.fullName}
                            {selectedUser.status === 'success' && (
                              <span className="text-emerald-400 font-black text-sm bg-white/20 px-2 py-0.5 rounded-md animate-pulse">
                                SUCCESS
                              </span>
                            )}
                          </h3>
                          {selectedUser.status !== 'success' && (
                            <button 
                              onClick={() => markUserSuccess(selectedUser.nic)}
                              className="bg-white text-indigo-600 px-4 py-1.5 rounded-xl font-black text-sm hover:bg-indigo-50 transition-all shadow-lg"
                            >
                              OK
                            </button>
                          )}
                        </div>
                        <p className="text-indigo-100 text-sm opacity-80">{selectedUser.nic}</p>
                      </div>

                      <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vehicle</p>
                            <p className="font-bold text-slate-900">{selectedUser.vehicleNumber}</p>
                            <p className="text-[10px] text-slate-500">{selectedUser.vehicleCategory}</p>
                          </div>
                          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Balance</p>
                            <p className="font-black text-indigo-600 text-xl">
                              {selectedUser.customQuota !== undefined ? selectedUser.customQuota : getQuota(selectedUser.vehicleCategory)}L
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Actions</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                const amount = prompt('Enter fuel amount to deduct (Liters):');
                                if (amount !== null && amount.trim() !== '' && !isNaN(Number(amount))) {
                                  recordTransaction(selectedUser.nic, Number(amount));
                                }
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                            >
                              <Fuel size={16} /> Fill Fuel
                            </button>
                            <button 
                              onClick={() => {
                                const newQuota = prompt('Set new total quota (Liters):', String(selectedUser.customQuota || getQuota(selectedUser.vehicleCategory)));
                                if (newQuota !== null) updateCustomQuota(selectedUser.nic, Number(newQuota));
                              }}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-bold text-sm transition-all"
                            >
                              Edit Quota
                            </button>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction History</p>
                          <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                            {selectedUser.transactions && selectedUser.transactions.length > 0 ? (
                              selectedUser.transactions.map(t => (
                                <div key={t.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                  <div>
                                    <p className="text-xs font-bold text-slate-700">{t.date}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">ID: {t.id}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-red-500">-{t.amount}L</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Deducted</p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                No transactions recorded yet.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center sticky top-6">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <User className="text-slate-300" size={32} />
                      </div>
                      <h4 className="font-bold text-slate-400">Select a user to view details</h4>
                      <p className="text-xs text-slate-400 mt-2">Search by User ID or click on a row in the table.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Confirmation Modal */}
              <AnimatePresence>
                {userToDelete && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100"
                    >
                      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-center mb-2">Confirm Deletion</h3>
                      <p className="text-slate-500 text-center mb-8">
                        Are you sure you want to delete this registration? This action cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setUserToDelete(null)}
                          className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => deleteUser(userToDelete)}
                          className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Fuel Fill Success Animation */}
              <AnimatePresence>
                {showSuccess && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-md"
                  >
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0 }}
                      transition={{ type: "spring", damping: 12, stiffness: 200 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-200 mb-6">
                        <CheckCircle2 size={80} className="text-white" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">FUEL RECORDED</h2>
                      <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-2">Transaction Successful</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : view === 'public-receipt' && receiptData ? (
            <motion.div
              key="public-receipt"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="bg-emerald-600 p-8 text-white text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-full mb-4">
                    <CheckCircle2 size={24} />
                  </div>
                  <h2 className="text-2xl font-bold">Verified Fuel Receipt</h2>
                  <p className="text-emerald-100 text-sm opacity-90">Official Digital Verification</p>
                </div>
                
                <div className="p-8 space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-center">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Available Quota</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-black text-emerald-600">{receiptData.q}</span>
                      <span className="text-lg font-bold text-emerald-400 uppercase">Liters</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                      <span className="text-slate-400 text-sm font-medium">Vehicle Category</span>
                      <span className="text-slate-800 font-bold">{receiptData.v}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                      <span className="text-slate-400 text-sm font-medium">Vehicle Number</span>
                      <span className="text-slate-800 font-bold">{receiptData.n}</span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-slate-50">
                      <span className="text-slate-400 text-sm font-medium">Issue Date</span>
                      <span className="text-slate-800 font-bold">{receiptData.d}</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-3 rounded-xl font-bold text-sm">
                      <Tag size={16} />
                      AUTHENTICATED RECEIPT
                    </div>
                  </div>

                  <button 
                    onClick={() => window.location.href = window.location.origin}
                    className="w-full text-slate-400 text-sm font-medium hover:text-indigo-600 transition-colors pt-4"
                  >
                    Go to Endana Pirawumhala Portal
                  </button>
                </div>
              </div>
              <p className="text-center mt-6 text-slate-400 text-xs">
                This receipt is dynamically generated and verified by the Fuel Management System.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="details-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="max-w-2xl mx-auto"
            >
              <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="bg-indigo-600 px-8 py-12 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <CheckCircle2 size={24} className="text-indigo-200" />
                      <span className="text-indigo-100 font-medium tracking-wide uppercase text-xs">Registration Successful</span>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                      <div>
                        <h2 className="text-4xl font-bold mb-2">Welcome, {formData.fullName.split(' ')[0]}!</h2>
                        <p className="text-indigo-100 text-lg opacity-90">Your vehicle registration details are now active.</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 self-start md:self-auto">
                        <p className="text-[10px] uppercase tracking-widest text-indigo-200 font-bold mb-0.5">User ID</p>
                        <p className="text-xl font-mono font-bold text-white">#{formData.userId || '-----'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 md:p-12 space-y-8">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1 w-full">
                      <FuelQuotaWidget category={formData.vehicleCategory} formData={formData} />
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 print:border-none print:shadow-none">
                      <div className="hidden">
                        <QRCodeCanvas
                          id="qr-code-canvas"
                          value={`${window.location.origin}/?receipt=${btoa(JSON.stringify({
                            v: formData.vehicleCategory,
                            q: formData.customQuota !== undefined ? formData.customQuota : getQuota(formData.vehicleCategory),
                            n: formData.vehicleNumber,
                            d: new Date().toLocaleDateString()
                          }))}`}
                          size={512}
                          level="H"
                        />
                      </div>
                      <QRCodeSVG 
                        value={JSON.stringify({
                          name: formData.fullName,
                          nic: formData.nic,
                          vehicle: formData.vehicleNumber,
                          category: formData.vehicleCategory,
                          date: new Date().toLocaleDateString()
                        })}
                        size={120}
                        level="H"
                        includeMargin={true}
                      />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <QrCode size={12} />
                        Scan to Verify
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <DetailItem
                      icon={<User size={20} />}
                      label="Full Name"
                      value={formData.fullName}
                    />
                    <DetailItem
                      icon={<CreditCard size={20} />}
                      label="NIC Number"
                      value={formData.nic}
                    />
                    <DetailItem
                      icon={<Phone size={20} />}
                      label="Phone Number"
                      value={formData.phone}
                    />
                    <DetailItem
                      icon={<Car size={20} />}
                      label="Vehicle Number"
                      value={formData.vehicleNumber}
                    />
                    <DetailItem
                      icon={<Tag size={20} />}
                      label="Vehicle Category"
                      value={formData.vehicleCategory}
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <DetailItem
                      icon={<MapPin size={20} />}
                      label="Registered Address"
                      value={formData.address}
                      fullWidth
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Download Receipt
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      Print Details
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-600 font-semibold py-4 px-6 rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut size={18} />
                      New Vehicle
                    </button>
                  </div>
                </div>
              </div>
              
              <p className="text-center mt-8 text-slate-400 text-sm">
                Registration ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} • {new Date().toLocaleDateString()}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function DetailItem({ icon, label, value, fullWidth = false }: { icon: ReactNode, label: string, value: string, fullWidth?: boolean }) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-center gap-2 text-slate-400">
        <span className="text-indigo-500">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-medium text-slate-800 leading-relaxed">{value}</p>
    </div>
  );
}

function getQuota(cat: string) {
  switch (cat) {
    case 'Motorbike': return 5;
    case 'Van': return 20;
    case 'Bus': return 30;
    case 'Car': return 15;
    case 'Three-Wheeler': return 10;
    case 'Lorry': return 40;
    default: return 0;
  }
}

function FuelQuotaWidget({ category, formData }: { category: string, formData: UserData }) {
  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Motorbike': return <Bike size={32} />;
      case 'Lorry': return <Truck size={32} />;
      case 'Bus': return <Truck size={32} />; // Using Truck for Bus as well or Car
      default: return <Car size={32} />;
    }
  };

  const quota = formData.customQuota !== undefined 
    ? formData.customQuota 
    : getQuota(category);

  return (
    <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex items-center justify-between group hover:bg-indigo-100/50 transition-colors">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
          {getIcon(category)}
        </div>
        <div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Weekly Fuel Quota</p>
          <h3 className="text-2xl font-bold text-slate-800">{category}</h3>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-baseline gap-1 justify-end">
          <span className="text-4xl font-black text-indigo-600">{quota}</span>
          <span className="text-sm font-bold text-indigo-400 uppercase">Liters</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-tighter mt-1">
          <Fuel size={12} />
          Refreshes every Monday
        </div>
      </div>
    </div>
  );
}
