
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    User, Page, Transaction, LoyaltyProgram, RunningProgram, 
    Reward, RaffleProgram, RaffleWinner, Redemption, 
    SpecialNumber, WhatsAppSettings, UserProfile, CouponRedemption, UserRole
} from '../types';
import { ICONS } from '../constants';

// Components
import MainLayout from '../components/layout/MainLayout';
import LoadingOverlay from '../components/common/LoadingOverlay';
import Modal from '../components/common/Modal';

// Pages
import LandingPage from '../pages/landing/LandingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import PelangganDashboard from '../pages/pelanggan/PelangganDashboard';
import HistoryPembelian from '../pages/pelanggan/HistoryPembelian';
import PencapaianProgram from '../pages/pelanggan/PencapaianProgram';
import TukarPoin from '../pages/pelanggan/TukarPoin';
import EditProfilePage from '../pages/shared/EditProfilePage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import ManajemenPelanggan from '../pages/admin/ManajemenPelanggan';
import TambahUserPage from '../pages/admin/TambahUserPage';
import ManajemenProgram from '../pages/admin/ManajemenProgram';
import ManajemenPoin from '../pages/admin/ManajemenPoin';
import ManajemenHadiah from '../pages/admin/ManajemenHadiah';
import ManajemenUndian from '../pages/admin/ManajemenUndian';
import ManajemenPenukaran from '../pages/admin/ManajemenPenukaran';
import ManajemenTransaksi from '../pages/admin/ManajemenTransaksi';
import ManajemenNotifikasi from '../pages/admin/ManajemenNotifikasi';
import NomorSpesialPage from '../pages/shared/NomorSpesialPage';
import ManajemenNomor from '../pages/admin/ManajemenNomorSpesial';

const App: React.FC = () => {
    // --- State Management ---
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');
    const [modal, setModal] = useState<{ show: boolean, title: string, content: React.ReactNode } | null>(null);
    const [isInitializing, setIsInitializing] = useState(true); // Prevent flash of login screen

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
    const [locations, setLocations] = useState<any[]>([]); // For registration dropdowns

    // Helper: Determine roles
    const isSupervisor = currentUser?.role === 'supervisor';
    const isOperator = currentUser?.role === 'operator';

    // --- Session Persistence & Initialization ---
    useEffect(() => {
        const initializeApp = async () => {
            const storedUser = localStorage.getItem('mitra_user_session');
            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    setCurrentUser(parsedUser);
                    // Restore correct dashboard based on role
                    if (parsedUser.role === 'pelanggan') setCurrentPage('pelangganDashboard');
                    else if (parsedUser.role === 'operator') setCurrentPage('manajemenNomor');
                    else setCurrentPage('adminDashboard');
                } catch (e) {
                    console.error("Failed to parse stored user", e);
                    localStorage.removeItem('mitra_user_session');
                }
            }
            await fetchBootstrapData(); // Fetch initial data regardless of login status
            setIsInitializing(false);
        };

        initializeApp();
    }, []); // Run once on mount

    // --- Data Fetching ---
    const fetchBootstrapData = useCallback(async () => {
        // Only show loading on explicit calls, not initial background fetch if prefered, 
        // but here we keep it simple or manage based on isInitializing
        if (!isInitializing) setIsGlobalLoading(true); 
        
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

            // Update current user if logged in to get latest points/data
            // Access currentUser from state (needs to be in dependency or use functional update if inside effect)
            // Here we use the functional update pattern or just rely on the fact that if we just logged in, we have data.
            // But for refreshing data while logged in:
            setCurrentUser(prevUser => {
                if (prevUser) {
                    const updatedUser = (data.users || []).find((u: User) => u.id === prevUser.id);
                    if (updatedUser) {
                        // Update local storage with fresh data
                        localStorage.setItem('mitra_user_session', JSON.stringify(updatedUser));
                        return updatedUser;
                    }
                }
                return prevUser;
            });

        } catch (error) {
            console.error("Failed to fetch bootstrap data", error);
        } finally {
            if (!isInitializing) setIsGlobalLoading(false);
        }
    }, [isInitializing]);

    // --- Authentication Handlers ---
    const handleLogin = async (id: string, password: string): Promise<boolean> => {
        setIsGlobalLoading(true);
        setLoadingMessage('Sedang login...');
        try {
            const response = await axios.post('/api/auth/login', { id, password });
            const user = response.data;
            setCurrentUser(user);
            
            // SAVE SESSION
            localStorage.setItem('mitra_user_session', JSON.stringify(user));
            
            // Redirect logic
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
        setCurrentPage('landing');
        setUsers([]); // Clear sensitive data from memory
        setTransactions([]);
        localStorage.removeItem('mitra_user_session'); // CLEAR SESSION
    };

    // --- User Management ---
    const updateUserProfile = async (profile: UserProfile, photoFile: File | null) => {
        // Stub: Implement API call
        console.log("Updating profile", profile, photoFile);
        // Optimistic update
        if (currentUser) {
            const updated = { ...currentUser, profile };
            setCurrentUser(updated);
            localStorage.setItem('mitra_user_session', JSON.stringify(updated));
        }
    };

    const handleChangePassword = async (o: string, n: string) => {
        // Stub
        console.log("Changing password");
        return true;
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
        // Stub using FormData
        const formData = new FormData();
        Object.keys(programData).forEach(key => formData.append(key, programData[key]));
        if (photoFile) formData.append('image', photoFile);
        
        // await axios.post('/api/programs', formData);
        console.log("Saving program", formData);
        await fetchBootstrapData();
    };

    const adminDeleteProgram = async (id: number) => {
        await axios.delete(`/api/programs/${id}`);
        await fetchBootstrapData();
    };

    const adminBulkUpdateProgramProgress = async (programId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`/api/programs/${programId}/progress`, formData);
        await fetchBootstrapData();
    };

    const adminUpdateProgramParticipants = async (programId: number, participantIds: string[]) => {
        await axios.put(`/api/programs/${programId}/participants`, { participantIds });
        await fetchBootstrapData();
    };

    const adminBulkAddProgramParticipants = async (programId: number, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post(`/api/programs/${programId}/participants/bulk`, formData);
        await fetchBootstrapData();
    };

    // --- Points & Transactions ---
    const adminUpdateLoyaltyProgram = async (program: LoyaltyProgram) => {
        await axios.put(`/api/loyalty-programs/${program.level}`, program);
        await fetchBootstrapData();
    };

    const adminAddTransaction = async (data: any) => {
        await axios.post('/api/transactions', data);
        await fetchBootstrapData();
    };

    const adminBulkAddTransactions = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/transactions/bulk', formData);
        await fetchBootstrapData();
    };

    const adminUpdatePointsManual = async (userId: string, points: number, action: 'tambah' | 'kurang') => {
        await axios.post(`/api/users/${userId}/points`, { points, action });
        await fetchBootstrapData();
    };

    const adminBulkUpdateLevels = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/users/levels/bulk', formData);
        await fetchBootstrapData();
    };

    // --- Rewards ---
    const saveReward = async (rewardData: any, photoFile: File | null) => {
        const formData = new FormData();
        Object.keys(rewardData).forEach(key => formData.append(key, rewardData[key]));
        if (photoFile) formData.append('image', photoFile);
        
        await axios.post('/api/rewards', formData);
        await fetchBootstrapData();
    };

    const adminDeleteReward = async (id: number) => {
        await axios.delete(`/api/rewards/${id}`);
        await fetchBootstrapData();
    };

    const adminReorderRewards = async (orderData: any[]) => {
        await axios.put('/api/rewards/reorder', { orderData });
        await fetchBootstrapData();
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
        await axios.post('/api/raffles', program);
        await fetchBootstrapData();
    };

    const deleteRaffleProgram = async (id: number) => {
        await axios.delete(`/api/raffles/${id}`);
        await fetchBootstrapData();
    };

    // --- Redemptions ---
    const adminUpdateRedemptionStatus = async (id: number, status: string, note: string, photoFile?: File | null) => {
        const formData = new FormData();
        formData.append('status', status);
        formData.append('note', note);
        if (photoFile) formData.append('photo', photoFile);
        
        await axios.put(`/api/redemptions/${id}/status`, formData);
        await fetchBootstrapData();
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
        if(!window.confirm(`Anda akan menyinkronkan poin untuk SEMUA MITRA. Proses ini akan:\n\n1. Menghitung poin valid berdasarkan riwayat transaksi.\n2. Membatalkan otomatis penukaran pending jika poin tidak cukup.\n3. Mengirim Notifikasi WA ke mitra yang penukarannya dibatalkan.\n4. Mengupdate saldo semua mitra.\n\nLanjutkan?`)) return;

        setIsGlobalLoading(true);
        setLoadingMessage('Mengaudit & Memperbaiki Poin...');
        try {
            const response = await fetch('/api/audit/bulk-fix', { method: 'POST' });
            const result = await response.json();

            if (response.ok) {
                await fetchBootstrapData();
                setModal({ show: true, title: "Audit Selesai", content: <p>{result.message}</p> });
            } else {
                setModal({ show: true, title: "Error", content: <p>{result.message}</p> });
            }
        } catch (error) {
            console.error(error);
            setModal({ show: true, title: "Error", content: <p>Terjadi kesalahan koneksi saat sinkronisasi massal.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminAuditSingleUser = async (userId: string) => {
        setIsGlobalLoading(true);
        setLoadingMessage('Memperbaiki Poin...');
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
    };

    const adminResetPassword = async (userId: string) => {
        await axios.post(`/api/users/${userId}/reset-password`);
        await fetchBootstrapData();
        setModal({ show: true, title: "Sukses", content: <p>Password berhasil direset.</p> });
    };

    const adminSetUserPoints = async (userId: string, points: number) => {
        await axios.put(`/api/users/${userId}/points-set`, { points });
        await fetchBootstrapData();
        return true;
    };

    // --- Special Numbers ---
    const adminManageSpecialNumber = async (number: any) => {
        await axios.post('/api/special-numbers', number);
        await fetchBootstrapData();
    };

    const adminDeleteSpecialNumber = async (id: number) => {
        await axios.delete(`/api/special-numbers/${id}`);
        await fetchBootstrapData();
    };

    const adminUpdateSpecialNumberStatus = async (id: number, isSold: boolean) => {
        await axios.put(`/api/special-numbers/${id}/status`, { isSold });
        await fetchBootstrapData();
    };

    const adminBulkUploadNumbers = async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/special-numbers/bulk', formData);
        await fetchBootstrapData();
    };

    const adminUploadSpecialNumberBanner = async (file: File) => {
        const formData = new FormData();
        formData.append('banner', file);
        await axios.post('/api/special-numbers/banner', formData);
        await fetchBootstrapData();
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
        manajemenHadiah: <ManajemenHadiah rewards={rewards} onSave={saveReward} deleteReward={adminDeleteReward} isReadOnly={isSupervisor} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminReorderRewards={adminReorderRewards} />,
        manajemenUndian: <ManajemenUndian users={users.filter(u => u.role === 'pelanggan')} programs={rafflePrograms} redemptions={couponRedemptions} onSave={saveRaffleProgram} onDelete={deleteRaffleProgram} isReadOnly={isSupervisor} />,
        manajemenPenukaran: <ManajemenPenukaran redemptions={redemptionHistory} users={users} isReadOnly={isSupervisor} adminUpdateRedemptionStatus={adminUpdateRedemptionStatus} adminBulkUpdateRedemptionStatus={adminBulkUpdateRedemptionStatus} />,
        manajemenTransaksi: <ManajemenTransaksi transactions={transactions} users={users} />,
        manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={adminSaveWhatsAppSettings} isReadOnly={isSupervisor} />,
        nomorSpesial: <NomorSpesialPage currentUser={currentUser!} numbers={specialNumbers.filter(n => !n.isSold)} recipientNumber={whatsAppSettings?.specialNumberRecipient || ''} specialNumberBannerUrl={specialNumberBannerUrl} />,
        manajemenNomor: <ManajemenNomor currentUser={currentUser!} numbers={specialNumbers} onSave={adminManageSpecialNumber} onDelete={adminDeleteSpecialNumber} onStatusChange={adminUpdateSpecialNumberStatus} onBulkUpload={adminBulkUploadNumbers} adminUploadSpecialNumberBanner={adminUploadSpecialNumberBanner} settings={whatsAppSettings} onSaveSettings={adminSaveWhatsAppSettings} />,
    };

    // --- Loading State ---
    if (isInitializing) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600 font-semibold animate-pulse">Memuat Aplikasi...</p>
                </div>
            </div>
        );
    }

    // --- Main Render ---
    const isPublicPage = ['landing', 'login', 'register'].includes(currentPage);

    if (isPublicPage) {
        if (currentPage === 'landing') return <LandingPage setCurrentPage={handlePageChange} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} loyaltyPrograms={loyaltyPrograms} redemptionHistory={redemptionHistory} />;
        if (currentPage === 'login') return <LoginPage handleLogin={handleLogin} setCurrentPage={handlePageChange} />;
        if (currentPage === 'register') return <RegisterPage handleRegister={handleRegister} setCurrentPage={handlePageChange} locations={locations} />;
        return null;
    }

    if (!currentUser) {
        // Fallback if trying to access protected route without user
        setCurrentPage('landing');
        return null;
    }

    return (
        <MainLayout currentUser={currentUser} currentPage={currentPage} setCurrentPage={handlePageChange} handleLogout={handleLogout}>
            <LoadingOverlay isVisible={isGlobalLoading} message={loadingMessage} />
            {modal && <Modal show={modal.show} onClose={() => setModal(null)} title={modal.title}>{modal.content}</Modal>}
            {pageMap[currentPage]}
        </MainLayout>
    );
};

export default App;
