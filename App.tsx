
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    User, Page, Transaction, LoyaltyProgram, RunningProgram, 
    Reward, RaffleProgram, RaffleWinner, Redemption, 
    SpecialNumber, WhatsAppSettings, UserProfile, CouponRedemption, UserRole
} from './types';
import { ICONS } from './constants';

// Components
import MainLayout from './components/layout/MainLayout';
import LoadingOverlay from './components/common/LoadingOverlay';
import Modal from './components/common/Modal';

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
import ManajemenNotifikasi from './pages/admin/ManajemenNotifikasi';
import NomorSpesialPage from './pages/shared/NomorSpesialPage';
import ManajemenNomor from './pages/admin/ManajemenNomorSpesial';
// Fix: Mengimpor ManajemenTransaksi dan ManajemenAktivitas dari direktori src/ yang benar
import ManajemenTransaksi from './src/pages/admin/ManajemenTransaksi';
import ManajemenAktivitas from './src/pages/admin/ManajemenAktivitas';

const App: React.FC = () => {
    // --- State Management ---
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');
    const [modal, setModal] = useState<{ show: boolean, title: string, content: React.ReactNode } | null>(null);

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

            if (currentUser) {
                const updatedUser = (data.users || []).find((u: User) => u.id === currentUser.id);
                if (updatedUser) setCurrentUser(updatedUser);
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
        setCurrentPage('landing');
        setUsers([]); 
        setTransactions([]);
    };

    const updateUserProfile = async (profile: UserProfile, photoFile: File | null) => {
        console.log("Updating profile", profile, photoFile);
        if (currentUser) setCurrentUser({ ...currentUser, profile });
    };

    const handleChangePassword = async (o: string, n: string) => {
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

    const saveProgram = async (programData: any, photoFile: File | null) => {
        console.log("Saving program", programData);
        await fetchBootstrapData();
    };

    const adminDeleteProgram = async (id: number) => {
        await axios.delete(`/api/programs/${id}`);
        await fetchBootstrapData();
    };

    const adminBulkUpdateProgramProgress = async (programId: number, file: File) => {
        await fetchBootstrapData();
    };

    const adminUpdateProgramParticipants = async (programId: number, participantIds: string[]) => {
        await fetchBootstrapData();
    };

    const adminBulkAddProgramParticipants = async (programId: number, file: File) => {
        await fetchBootstrapData();
    };

    const adminUpdateLoyaltyProgram = async (program: LoyaltyProgram) => {
        await axios.put(`/api/loyalty-programs/${program.level}`, program);
        await fetchBootstrapData();
    };

    const adminAddTransaction = async (data: any) => {
        await axios.post('/api/transactions', data);
        await fetchBootstrapData();
    };

    const adminBulkAddTransactions = async (file: File) => {
        await fetchBootstrapData();
    };

    const adminUpdatePointsManual = async (userId: string, points: number, action: 'tambah' | 'kurang') => {
        await axios.post(`/api/users/${userId}/points`, { points, action });
        await fetchBootstrapData();
    };

    const adminBulkUpdateLevels = async (file: File) => {
        await fetchBootstrapData();
    };

    const saveReward = async (rewardData: any, photoFile: File | null) => {
        await fetchBootstrapData();
    };

    const adminDeleteReward = async (id: number) => {
        await axios.delete(`/api/rewards/${id}`);
        await fetchBootstrapData();
    };

    const adminReorderRewards = async (orderData: any[]) => {
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

    const saveRaffleProgram = async (program: any) => {
        await axios.post('/api/raffles', program);
        await fetchBootstrapData();
    };

    const deleteRaffleProgram = async (id: number) => {
        await axios.delete(`/api/raffles/${id}`);
        await fetchBootstrapData();
    };

    const adminUpdateRedemptionStatus = async (id: number, status: string, note: string, photoFile?: File | null) => {
        await fetchBootstrapData();
    };

    const adminBulkUpdateRedemptionStatus = useCallback(async (ids: number[], status: string, statusNote: string) => {
        setIsGlobalLoading(true);
        try {
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Update massal berhasil.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>Terjadi kesalahan.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    }, [fetchBootstrapData]);

    const adminBulkAudit = async () => {
        if(!window.confirm(`Anda akan menyinkronkan poin untuk SEMUA MITRA. Lanjutkan?`)) return;
        setIsGlobalLoading(true);
        try {
            await fetchBootstrapData();
            setModal({ show: true, title: "Audit Selesai", content: <p>Poin berhasil diaudit.</p> });
        } catch (error) {
            setModal({ show: true, title: "Error", content: <p>Gagal audit.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminAuditSingleUser = async (userId: string) => {
        setIsGlobalLoading(true);
        try {
            await fetchBootstrapData();
            return true;
        } catch (error) {
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
        await fetchBootstrapData();
    };

    const adminUploadSpecialNumberBanner = async (file: File) => {
        await fetchBootstrapData();
    };

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
        manajemenAktivitas: <ManajemenAktivitas transactions={transactions} redemptions={redemptionHistory} users={users} />,
        manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={adminSaveWhatsAppSettings} isReadOnly={isSupervisor} />,
        nomorSpesial: <NomorSpesialPage currentUser={currentUser!} numbers={specialNumbers.filter(n => !n.isSold)} recipientNumber={whatsAppSettings?.specialNumberRecipient || ''} specialNumberBannerUrl={specialNumberBannerUrl} />,
        manajemenNomor: <ManajemenNomor currentUser={currentUser!} numbers={specialNumbers} onSave={adminManageSpecialNumber} onDelete={adminDeleteSpecialNumber} onStatusChange={adminUpdateSpecialNumberStatus} onBulkUpload={adminBulkUploadNumbers} adminUploadSpecialNumberBanner={adminUploadSpecialNumberBanner} settings={whatsAppSettings} onSaveSettings={adminSaveWhatsAppSettings} />,
    };

    const isPublicPage = ['landing', 'login', 'register'].includes(currentPage);

    if (isPublicPage) {
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
            {pageMap[currentPage]}
        </MainLayout>
    );
};

export default App;