
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    User, Page, Transaction, LoyaltyProgram, RunningProgram, 
    Reward, RaffleProgram, RaffleWinner, Redemption, 
    SpecialNumber, WhatsAppSettings, UserProfile, CouponRedemption, UserRole
} from './types'; // Fixed: pointing to local src/types.ts which has manajemenAktivitas
import { ICONS } from '../constants';

// Components
import MainLayout from './components/layout/MainLayout';
import LoadingOverlay from './components/common/LoadingOverlay';
import Modal from './components/common/Modal';
import Toast from './components/common/Toast';

// Pages
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import PelangganDashboard from './pages/pelanggan/PelangganDashboard';
import HistoryPembelian from './pages/pelanggan/HistoryPembelian';
import PencapaianProgram from './pages/pelanggan/PencapaianProgram';
import TukarPoin from './pages/pelanggan/TukarPoin';
import EditProfilePage from './pages/shared/EditProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManajemenPelanggan from './pages/admin/ManajemenPelanggan';
import TambahUserPage from './pages/admin/TambahUserPage';
import ManajemenProgram from './pages/admin/ManajemenProgram';
import ManajemenPoin from './pages/admin/ManajemenPoin';
import ManajemenHadiah from './pages/admin/ManajemenHadiah';
import ManajemenUndian from './pages/admin/ManajemenUndian';
import ManajemenPenukaran from './pages/admin/ManajemenPenukaran';
import ManajemenTransaksi from './pages/admin/ManajemenTransaksi';
import ManajemenNotifikasi from './pages/admin/ManajemenNotifikasi';
import NomorSpesialPage from './pages/shared/NomorSpesialPage';
import ManajemenNomor from './pages/admin/ManajemenNomorSpesial';
import ManajemenAktivitas from './pages/admin/ManajemenAktivitas';

const App: React.FC = () => {
    // --- Session Persistence Helper ---
    const getStoredUser = (): User | null => {
        const saved = localStorage.getItem('mitra_user_session');
        if (!saved) return null;
        try {
            return JSON.parse(saved);
        } catch (e) {
            localStorage.removeItem('mitra_user_session');
            return null;
        }
    };

    const getInitialPage = (user: User | null): Page => {
        if (!user) return 'landing';
        if (user.role === 'pelanggan') return 'pelangganDashboard';
        if (user.role === 'admin' || user.role === 'supervisor') return 'adminDashboard';
        if (user.role === 'operator') return 'manajemenNomor';
        return 'landing';
    };

    // --- State Management ---
    const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
    const [currentPage, setCurrentPage] = useState<Page>(getInitialPage(getStoredUser()));
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');
    const [modal, setModal] = useState<{ show: boolean, title: string, content: React.ReactNode } | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
    const [runningPrograms, setRunningPrograms] = useState<RunningProgram[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [rafflePrograms, setRafflePrograms] = useState<RaffleProgram[]>([]);
    const [raffleWinners, setRaffleWinners] = useState<RaffleWinner[]>([]);
    const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>([]);
    const [couponRedemptions, setCouponRedemptions] = useState<CouponRedemption[]>([]);
    const [specialNumbers, setSpecialNumbers] = useState<SpecialNumber[]>([]);
    const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings | null>(null);
    const [specialNumberBannerUrl, setSpecialNumberBannerUrl] = useState<string | null>(null);
    const [locations, setLocations] = useState<any[]>([]);

    // Helper: Determine roles
    const isSupervisor = currentUser?.role === 'supervisor';
    const isOperator = currentUser?.role === 'operator';

    // --- Toast Helper ---
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    // --- Data Fetching ---
    const fetchBootstrapData = useCallback(async () => {
        setIsGlobalLoading(true);
        setLoadingMessage('Menyiapkan data aplikasi...');
        try {
            const response = await axios.get('/api/bootstrap'); 
            const data = response.data;

            setUsers(data.users || []);
            setTransactions(data.transactions || []);
            setLoyaltyPrograms(data.loyaltyPrograms || []);
            setRunningPrograms(data.runningPrograms || []);
            setRewards(data.rewards || []);
            setRafflePrograms(data.rafflePrograms || []);
            setRaffleWinners(data.raffleWinners || []);
            setRedemptionHistory(data.redemptions || []);
            setCouponRedemptions(data.couponRedemptions || []);
            setSpecialNumbers(data.specialNumbers || []);
            setWhatsAppSettings(data.whatsAppSettings || null);
            setSpecialNumberBannerUrl(data.specialNumberBannerUrl || null);
            setLocations(data.locations || []);

            // Sync current user state with latest database points/level
            if (currentUser) {
                const updatedUser = (data.users || []).find((u: User) => u.id === currentUser.id);
                if (updatedUser) {
                    const mergedUser = { ...currentUser, ...updatedUser };
                    setCurrentUser(mergedUser);
                    localStorage.setItem('mitra_user_session', JSON.stringify(mergedUser));
                }
            }

        } catch (error) {
            console.error("Failed to fetch bootstrap data", error);
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchBootstrapData();
    }, []);

    // --- Authentication Handlers ---
    const handleLogin = async (id: string, password: string): Promise<boolean> => {
        setIsGlobalLoading(true);
        setLoadingMessage('Sedang login...');
        try {
            const response = await axios.post('/api/auth/login', { id, password });
            const user = response.data;
            
            localStorage.setItem('mitra_user_session', JSON.stringify(user));
            setCurrentUser(user);
            
            if (user.role === 'pelanggan') setCurrentPage('pelangganDashboard');
            else if (user.role === 'admin') setCurrentPage('adminDashboard');
            else if (user.role === 'supervisor') setCurrentPage('adminDashboard');
            else if (user.role === 'operator') setCurrentPage('manajemenNomor');
            
            await fetchBootstrapData();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleRegister = async (formData: any): Promise<boolean> => {
        try {
            await axios.post('/api/auth/register', formData);
            setModal({ show: true, title: "Registrasi Berhasil", content: <p>Silakan login dengan akun baru Anda.</p> });
            setCurrentPage('login');
            return true;
        } catch (error: any) {
            setModal({ show: true, title: "Registrasi Gagal", content: <p>{error.response?.data?.message || 'Terjadi kesalahan.'}</p> });
            return false;
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('mitra_user_session');
        setCurrentPage('landing');
        setUsers([]); 
        setTransactions([]);
    };

    // --- User Management ---
    const updateUserProfile = async (profile: UserProfile, photoFile: File | null) => {
        setIsGlobalLoading(true);
        try {
            const formData = new FormData();
            Object.entries(profile).forEach(([key, value]) => {
                if (value !== undefined && value !== null) formData.append(key, String(value));
            });
            if (photoFile) formData.append('photo', photoFile);

            const response = await axios.put(`/api/users/${currentUser?.id}/profile`, formData);
            
            if (currentUser) {
                const updatedUser = { 
                    ...currentUser, 
                    profile: { 
                        ...currentUser.profile, 
                        ...profile,
                        photoUrl: response.data.photoUrl || currentUser.profile.photoUrl 
                    } 
                };
                setCurrentUser(updatedUser);
                localStorage.setItem('mitra_user_session', JSON.stringify(updatedUser));
            }
            showToast('Profil berhasil diperbarui', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal memperbarui profil', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        if (!currentUser) return false;
        setIsGlobalLoading(true);
        try {
            await axios.put('/api/auth/change-password', {
                id: currentUser.id,
                oldPassword,
                newPassword
            });
            setModal({ show: true, title: "Sukses", content: <p>Password berhasil diubah.</p> });
            return true;
        } catch (error: any) {
            setModal({ 
                show: true, 
                title: "Gagal", 
                content: <p>{error.response?.data?.message || 'Gagal mengubah password.'}</p> 
            });
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminAddUser = async (user: User) => {
        setIsGlobalLoading(true);
        try {
            await axios.post('/api/users', user);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>User berhasil ditambahkan.</p> });
            setCurrentPage('manajemenPelanggan');
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.response?.data?.message || 'Gagal menambah user.'}</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    // --- Program Management ---
    const saveProgram = async (programData: any, photoFile: File | null) => {
        setIsGlobalLoading(true);
        try {
            const formData = new FormData();
            Object.keys(programData).forEach(key => {
                if (programData[key] !== undefined && programData[key] !== null) {
                    formData.append(key, programData[key]);
                }
            });
            if (photoFile) formData.append('image', photoFile);

            if (programData.id) {
                await axios.put(`/api/programs/${programData.id}`, formData);
            } else {
                await axios.post('/api/programs', formData);
            }
            await fetchBootstrapData();
            showToast('Program berhasil disimpan', 'success');
        } catch (e) {
            showToast('Gagal menyimpan program', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminDeleteProgram = async (id: number) => {
        await axios.delete(`/api/programs/${id}`);
        await fetchBootstrapData();
        showToast('Program dihapus', 'success');
    };

    const adminBulkUpdateProgramProgress = async (programId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`/api/programs/${programId}/progress`, formData);
        await fetchBootstrapData();
        showToast('Progres program berhasil diupdate', 'success');
    };

    const adminUpdateProgramParticipants = async (programId: number, participantIds: string[]) => {
        await axios.put(`/api/programs/${programId}/participants`, { participantIds });
        await fetchBootstrapData();
        showToast('Peserta program berhasil diupdate', 'success');
    };

    const adminBulkAddProgramParticipants = async (programId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`/api/programs/${programId}/participants/bulk`, formData);
        await fetchBootstrapData();
        showToast('Peserta program berhasil diupload', 'success');
    };

    // --- Points & Transactions ---
    const adminUpdateLoyaltyProgram = async (program: LoyaltyProgram) => {
        await axios.put(`/api/loyalty-programs/${program.level}`, program);
        await fetchBootstrapData();
        showToast('Level program berhasil diupdate', 'success');
    };

    const adminAddTransaction = async (data: any) => {
        await axios.post('/api/transactions', data);
        await fetchBootstrapData();
        showToast('Transaksi berhasil ditambahkan', 'success');
    };

    const adminBulkAddTransactions = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/transactions/bulk', formData);
        await fetchBootstrapData();
        showToast('Transaksi massal berhasil diupload', 'success');
    };

    const adminUpdatePointsManual = async (userId: string, points: number, action: 'tambah' | 'kurang') => {
        await axios.post(`/api/users/${userId}/points`, { points, action });
        await fetchBootstrapData();
        showToast('Poin berhasil diupdate manual', 'success');
    };

    const adminBulkUpdateLevels = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/users/levels/bulk', formData);
        await fetchBootstrapData();
        showToast('Level user berhasil diupdate massal', 'success');
    };

    // --- Rewards ---
    const saveReward = async (rewardData: any, photoFile: File | null) => {
        setIsGlobalLoading(true);
        try {
            const formData = new FormData();
            Object.keys(rewardData).forEach(key => {
                if (rewardData[key] !== undefined) formData.append(key, rewardData[key])
            });
            if (photoFile) formData.append('image', photoFile);
            
            if (rewardData.id) {
                await axios.put(`/api/rewards/${rewardData.id}`, formData);
            } else {
                await axios.post('/api/rewards', formData);
            }
            await fetchBootstrapData();
            showToast('Hadiah berhasil disimpan', 'success');
        } catch (e) {
            showToast('Gagal menyimpan hadiah', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminDeleteReward = async (id: number) => {
        await axios.delete(`/api/rewards/${id}`);
        await fetchBootstrapData();
        showToast('Hadiah berhasil dihapus', 'success');
    };

    const adminReorderRewards = async (orderData: any[]) => {
        await axios.put('/api/rewards/reorder', { orderData });
        await fetchBootstrapData();
        showToast('Urutan hadiah berhasil disimpan', 'success');
        return true;
    };

    const handleTukarClick = async (reward: Reward) => {
        if (!currentUser) return;
        setIsGlobalLoading(true);
        try {
            await axios.post('/api/redemptions', { rewardId: reward.id, userId: currentUser.id });
            await fetchBootstrapData();
            setModal({ show: true, title: "Berhasil", content: <p>Penukaran berhasil diajukan!</p> });
        } catch (error) {
            setModal({ show: true, title: "Gagal", content: <p>Gagal melakukan penukaran.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    // --- Raffles ---
    const saveRaffleProgram = async (program: any) => {
        setIsGlobalLoading(true);
        try {
            if (program.id) {
                await axios.put(`/api/raffles/${program.id}`, program);
            } else {
                await axios.post('/api/raffles', program);
            }
            await fetchBootstrapData();
            showToast('Program undian disimpan', 'success');
        } catch(e) {
            showToast('Gagal menyimpan program undian', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const deleteRaffleProgram = async (id: number) => {
        await axios.delete(`/api/raffles/${id}`);
        await fetchBootstrapData();
        showToast('Program undian dihapus', 'success');
    };

    // --- Redemptions ---
    const adminUpdateRedemptionStatus = async (id: number, status: string, note: string, photoFile?: File | null) => {
        const formData = new FormData();
        formData.append('status', status);
        formData.append('note', note);
        if (photoFile) formData.append('photo', photoFile);
        await axios.put(`/api/redemptions/${id}/status`, formData);
        await fetchBootstrapData();
        showToast('Status penukaran berhasil diupdate', 'success');
    };

    const adminBulkUpdateRedemptionStatus = useCallback(async (ids: number[], status: string, statusNote: string) => {
        setIsGlobalLoading(true);
        setLoadingMessage(`Mengupdate ${ids.length} Data...`);
        try {
            const response = await fetch('/api/redemptions/bulk/status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, status, statusNote }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    }, [fetchBootstrapData]);

    // --- Audit ---
    const adminBulkAudit = async () => {
        if(!window.confirm(`Anda akan menyinkronkan poin untuk SEMUA MITRA... Lanjutkan?`)) return;
        setIsGlobalLoading(true);
        setLoadingMessage('Mengaudit & Memperbaiki Poin...');
        try {
            const response = await fetch('/api/audit/bulk-fix', { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                await fetchBootstrapData();
                setModal({ 
                    show: true, 
                    title: "Audit Selesai", 
                    content: (
                        <div>
                            <p className="mb-2">{result.message}</p>
                            {result.report && (
                                <ul className="list-disc pl-5 text-sm space-y-1">
                                    <li>Diproses: <b>{result.report.processed}</b> akun</li>
                                    <li>Diperbaiki: <b>{result.report.fixed}</b> akun</li>
                                    <li>Dibatalkan: <b>{result.report.cancelled}</b> penukaran</li>
                                </ul>
                            )}
                        </div>
                    ) 
                });
            } else {
                setModal({ show: true, title: "Error", content: <p>{result.message}</p> });
            }
        } catch (error) {
            setModal({ show: true, title: "Error", content: <p>Terjadi kesalahan koneksi.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminAuditSingleUser = async (userId: string) => {
        setIsGlobalLoading(true);
        try {
            const response = await fetch(`/api/audit/fix/${userId}`, { method: 'POST' });
            const result = await response.json();
            if (response.ok) {
                await fetchBootstrapData();
                setModal({ show: true, title: "Audit Sukses", content: <p>{result.message}</p> });
                return true;
            } else {
                setModal({ show: true, title: "Error", content: <p>{result.message}</p> });
                return false;
            }
        } catch (error) {
            setModal({ show: true, title: "Error", content: <p>Gagal menghubungi server.</p> });
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminUpdateUserLevel = async (userId: string, level: string) => {
        await axios.put(`/api/users/${userId}/level`, { level });
        await fetchBootstrapData();
        showToast('Level user berhasil diupdate', 'success');
    };

    const adminResetPassword = async (userId: string) => {
        await axios.post(`/api/users/${userId}/reset-password`);
        await fetchBootstrapData();
        setModal({ show: true, title: "Sukses", content: <p>Password berhasil direset.</p> });
    };

    const adminSetUserPoints = async (userId: string, points: number) => {
        await axios.put(`/api/users/${userId}/points-set`, { points });
        await fetchBootstrapData();
        showToast('Poin user berhasil diupdate', 'success');
        return true;
    };

    // --- Special Numbers ---
    const adminManageSpecialNumber = async (number: any) => {
        setIsGlobalLoading(true);
        try {
            if (number.id) {
                await axios.put(`/api/special-numbers/${number.id}`, number);
            } else {
                await axios.post('/api/special-numbers', number);
            }
            await fetchBootstrapData();
            showToast('Nomor spesial berhasil disimpan', 'success');
        } catch(e) {
            showToast('Gagal menyimpan nomor', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminDeleteSpecialNumber = async (id: number) => {
        await axios.delete(`/api/special-numbers/${id}`);
        await fetchBootstrapData();
        showToast('Nomor spesial dihapus', 'success');
    };

    const adminUpdateSpecialNumberStatus = async (id: number, isSold: boolean) => {
        await axios.put(`/api/special-numbers/${id}/status`, { isSold });
        await fetchBootstrapData();
        showToast('Status nomor berhasil diupdate', 'success');
    };

    const adminBulkUploadNumbers = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/special-numbers/bulk', formData);
        await fetchBootstrapData();
        showToast('Upload nomor massal berhasil', 'success');
    };

    const adminUploadSpecialNumberBanner = async (file: File) => {
        const formData = new FormData();
        formData.append('banner', file);
        await axios.post('/api/special-numbers/banner', formData);
        await fetchBootstrapData();
        showToast('Banner berhasil diupload', 'success');
    };

    // --- Settings ---
    const adminSaveWhatsAppSettings = async (settings: WhatsAppSettings): Promise<boolean> => {
        try {
            await axios.put('/api/settings/whatsapp', settings);
            await fetchBootstrapData();
            return true;
        } catch (e) {
            return false;
        }
    };

    const handlePageChange = (page: Page) => setCurrentPage(page);

    // --- Routing/Rendering Logic ---
    const pageMap: {[key in Page]?: React.ReactNode} = {
        pelangganDashboard: <PelangganDashboard currentUser={currentUser!} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={handlePageChange} raffleWinners={raffleWinners} redemptionHistory={redemptionHistory} />,
        historyPembelian: <HistoryPembelian currentUser={currentUser!} transactions={transactions} redemptionHistory={redemptionHistory} />,
        pencapaianProgram: <PencapaianProgram currentUser={currentUser!} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
        tukarPoin: <TukarPoin currentUser={currentUser!} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
        editProfile: <EditProfilePage currentUser={currentUser!} updateUserProfile={updateUserProfile} handleLogout={handleLogout} handleChangePassword={handleChangePassword} />,
        adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms} specialNumbers={specialNumbers} redemptions={redemptionHistory} />,
        manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} redemptions={redemptionHistory} setCurrentPage={handlePageChange} isReadOnly={isSupervisor} loyaltyPrograms={loyaltyPrograms} adminUpdateUserLevel={adminUpdateUserLevel} adminResetPassword={adminResetPassword} adminSetUserPoints={adminSetUserPoints} adminAuditSingleUser={adminAuditSingleUser} adminBulkAudit={adminBulkAudit} />,
        tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
        manajemenProgram: <ManajemenProgram programs={runningPrograms} allUsers={users.filter(u => u.role === 'pelanggan')} onSave={saveProgram} onDelete={adminDeleteProgram} adminBulkUpdateProgramProgress={adminBulkUpdateProgramProgress} adminUpdateProgramParticipants={adminUpdateProgramParticipants} adminBulkAddProgramParticipants={adminBulkAddProgramParticipants} isReadOnly={isSupervisor} />,
        manajemenPoin: <ManajemenPoin currentUser={currentUser!} users={users.filter(u=>u.role==='pelanggan')} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={adminBulkAddTransactions} adminUpdatePointsManual={adminUpdatePointsManual} adminBulkUpdateLevels={adminBulkUpdateLevels} isReadOnly={isSupervisor} adminBulkAudit={adminBulkAudit} />,
        manajemenHadiah: <ManajemenHadiah rewards={rewards} onSave={saveReward} deleteReward={adminDeleteReward} isReadOnly={isReadOnly} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminReorderRewards={adminReorderRewards} />,
        manajemenUndian: <ManajemenUndian users={users.filter(u => u.role === 'pelanggan')} programs={rafflePrograms} redemptions={couponRedemptions} onSave={saveRaffleProgram} onDelete={deleteRaffleProgram} isReadOnly={isSupervisor} />,
        manajemenPenukaran: <ManajemenPenukaran redemptions={redemptionHistory} users={users} isReadOnly={isSupervisor} adminUpdateRedemptionStatus={adminUpdateRedemptionStatus} adminBulkUpdateRedemptionStatus={adminBulkUpdateRedemptionStatus} />,
        manajemenTransaksi: <ManajemenTransaksi transactions={transactions} users={users} />,
        manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={adminSaveWhatsAppSettings} isReadOnly={isSupervisor} showToast={showToast} />,
        nomorSpesial: <NomorSpesialPage currentUser={currentUser!} numbers={specialNumbers.filter(n => !n.isSold)} recipientNumber={whatsAppSettings?.specialNumberRecipient || ''} specialNumberBannerUrl={specialNumberBannerUrl} />,
        manajemenNomor: <ManajemenNomor currentUser={currentUser!} numbers={specialNumbers} onSave={adminManageSpecialNumber} onDelete={adminDeleteSpecialNumber} onStatusChange={adminUpdateSpecialNumberStatus} onBulkUpload={adminBulkUploadNumbers} adminUploadSpecialNumberBanner={adminUploadSpecialNumberBanner} settings={whatsAppSettings} onSaveSettings={adminSaveWhatsAppSettings} />,
        manajemenAktivitas: <ManajemenAktivitas transactions={transactions} redemptions={redemptionHistory} users={users} />,
    };

    // --- Main Render ---
    const isPublicPage = ['landing', 'login', 'register'].includes(currentPage);

    if (isPublicPage && !currentUser) {
        if (currentPage === 'landing') return <LandingPage setCurrentPage={handlePageChange} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} loyaltyPrograms={loyaltyPrograms} redemptionHistory={redemptionHistory} />;
        if (currentPage === 'login') return <LoginPage handleLogin={handleLogin} setCurrentPage={handlePageChange} />;
        if (currentPage === 'register') return <RegisterPage handleRegister={handleRegister} setCurrentPage={handlePageChange} locations={locations} />;
        return null;
    }

    if (!currentUser) {
        setCurrentPage('landing');
        return null;
    }

    return (
        <MainLayout currentUser={currentUser} currentPage={currentPage} setCurrentPage={handlePageChange} handleLogout={handleLogout}>
            <LoadingOverlay isVisible={isGlobalLoading} message={loadingMessage} />
            {modal && <Modal show={modal.show} onClose={() => setModal(null)} title={modal.title}>{modal.content}</Modal>}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {pageMap[currentPage]}
        </MainLayout>
    );
};

export default App;
