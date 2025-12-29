import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
    User, Page, Transaction, LoyaltyProgram, RunningProgram, 
    Reward, RaffleProgram, RaffleWinner, Redemption, 
    SpecialNumber, WhatsAppSettings, UserProfile, CouponRedemption, UserRole, Location
} from './types'; 
import { ICONS } from './constants';

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
    const getStoredUser = (): User | null => {
        const saved = localStorage.getItem('mitra_user_session');
        if (!saved) return null;
        try { return JSON.parse(saved); } catch { return null; }
    };

    const getInitialPage = (user: User | null): Page => {
        if (!user) return 'landing';
        if (user.role === 'pelanggan') return 'pelangganDashboard';
        if (user.role === 'admin' || user.role === 'supervisor') return 'adminDashboard';
        if (user.role === 'operator') return 'manajemenNomor';
        return 'landing';
    };

    const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser());
    const [currentPage, setCurrentPage] = useState<Page>(getInitialPage(getStoredUser()));
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');
    const [modal, setModal] = useState<{ show: boolean, title: string, content: React.ReactNode } | null>(null);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

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
    const [locations, setLocations] = useState<Location[]>([]);

    const isSupervisor = currentUser?.role === 'supervisor';

    const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type });

    const fetchBootstrapData = useCallback(async () => {
        setIsGlobalLoading(true);
        try {
            const response = await axios.get('/api/bootstrap');
            const d = response.data;
            setUsers(d.users || []);
            setTransactions(d.transactions || []);
            setLoyaltyPrograms(d.loyaltyPrograms || []);
            setRunningPrograms(d.runningPrograms || []);
            setRewards(d.rewards || []);
            setRafflePrograms(d.rafflePrograms || []);
            setRedemptionHistory(d.redemptions || []);
            setSpecialNumbers(d.specialNumbers || []);
            setWhatsAppSettings(d.whatsAppSettings || null);
            setLocations(d.locations || []);

            if (currentUser) {
                const updated = (d.users || []).find((u: User) => u.id === currentUser.id);
                if (updated) {
                    const merged = { ...currentUser, points: updated.points, level: updated.level };
                    setCurrentUser(merged);
                    localStorage.setItem('mitra_user_session', JSON.stringify(merged));
                }
            }
        } catch (error) {
            showToast('Gagal sinkronisasi data.', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    }, [currentUser]);

    useEffect(() => { fetchBootstrapData(); }, []);

    const handleLogin = async (id: string, pw: string) => {
        setIsGlobalLoading(true);
        try {
            const res = await axios.post('/api/auth/login', { id, password: pw });
            const user = res.data;
            localStorage.setItem('mitra_user_session', JSON.stringify(user));
            setCurrentUser(user);
            setCurrentPage(getInitialPage(user));
            await fetchBootstrapData();
            return true;
        } catch {
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('mitra_user_session');
        setCurrentPage('landing');
    };

    const adminBulkAudit = async () => {
        if(!window.confirm("Audit semua mitra?")) return;
        setIsGlobalLoading(true);
        try {
            const res = await axios.post('/api/audit/bulk-fix');
            await fetchBootstrapData();
            setModal({ show: true, title: "Audit Selesai", content: <p>{res.data.message}</p> });
        } catch {
            showToast('Audit gagal', 'error');
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminAuditSingleUser = async (uid: string) => {
        setIsGlobalLoading(true);
        try {
            const res = await axios.post(`/api/audit/fix/${uid}`);
            await fetchBootstrapData();
            return true;
        } catch {
            return false;
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handlePageChange = (p: Page) => setCurrentPage(p);

    const pageMap: {[key in Page]?: React.ReactNode} = {
        pelangganDashboard: <PelangganDashboard currentUser={currentUser!} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={handlePageChange} raffleWinners={raffleWinners} redemptionHistory={redemptionHistory} />,
        historyPembelian: <HistoryPembelian currentUser={currentUser!} transactions={transactions} redemptionHistory={redemptionHistory} />,
        pencapaianProgram: <PencapaianProgram currentUser={currentUser!} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
        tukarPoin: <TukarPoin currentUser={currentUser!} rewards={rewards} handleTukarClick={async (r) => {
            setIsGlobalLoading(true);
            try {
                await axios.post('/api/redemptions', { rewardId: r.id, userId: currentUser?.id });
                await fetchBootstrapData();
                setModal({ show: true, title: "Sukses", content: <p>Penukaran diajukan!</p> });
            } catch (e: any) {
                showToast(e.response?.data?.message || 'Gagal redeem', 'error');
            } finally { setIsGlobalLoading(false); }
        }} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
        editProfile: <EditProfilePage currentUser={currentUser!} updateUserProfile={async (p, f) => {
            const fd = new FormData();
            Object.entries(p).forEach(([k, v]) => fd.append(k, String(v)));
            if(f) fd.append('photo', f);
            await axios.put(`/api/users/${currentUser?.id}/profile`, fd);
            fetchBootstrapData();
        }} handleLogout={handleLogout} handleChangePassword={async (o, n) => {
            await axios.put('/api/auth/change-password', { id: currentUser?.id, oldPassword: o, newPassword: n });
            return true;
        }} />,
        adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms} specialNumbers={specialNumbers} redemptions={redemptionHistory} />,
        manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} redemptions={redemptionHistory} setCurrentPage={handlePageChange} isReadOnly={isSupervisor} loyaltyPrograms={loyaltyPrograms} 
            adminUpdateUserLevel={async (uid, lvl) => { await axios.put(`/api/users/${uid}/level`, { level: lvl }); fetchBootstrapData(); }} 
            adminResetPassword={async (uid) => { await axios.post(`/api/users/${uid}/reset-password`); fetchBootstrapData(); }} 
            adminSetUserPoints={async (uid, pts) => { await axios.put(`/api/users/${uid}/points-set`, { points: pts }); fetchBootstrapData(); return true; }} 
            adminAuditSingleUser={adminAuditSingleUser} 
            adminBulkAudit={adminBulkAudit} />,
        manajemenPoin: <ManajemenPoin currentUser={currentUser!} users={users.filter(u=>u.role==='pelanggan')} loyaltyPrograms={loyaltyPrograms} 
            updateLoyaltyProgram={async (lp) => { await axios.put(`/api/loyalty-programs/${lp.level}`, lp); fetchBootstrapData(); }} 
            adminAddTransaction={async (tx) => { await axios.post('/api/transactions', tx); fetchBootstrapData(); }} 
            adminBulkAddTransactions={async (f) => { const fd = new FormData(); fd.append('file', f); await axios.post('/api/transactions/bulk', fd); fetchBootstrapData(); }} 
            adminUpdatePointsManual={async (uid, pts, act) => { await axios.post(`/api/users/${uid}/points`, { points: pts, action: act }); fetchBootstrapData(); }} 
            adminBulkUpdateLevels={async (f) => { const fd = new FormData(); fd.append('file', f); await axios.post('/api/users/levels/bulk', fd); fetchBootstrapData(); }} 
            isReadOnly={isSupervisor} adminBulkAudit={adminBulkAudit} />,
        // Fix: isReadOnly was using undefined variable isReadOnly, changed to isSupervisor
        manajemenPenukaran: <ManajemenPenukaran redemptions={redemptionHistory} users={users} isReadOnly={isSupervisor} 
            adminUpdateRedemptionStatus={async (rid, s, n, f) => { const fd = new FormData(); fd.append('status', s); fd.append('note', n); if(f) fd.append('photo', f); await axios.put(`/api/redemptions/${rid}/status`, fd); fetchBootstrapData(); }} 
            adminBulkUpdateRedemptionStatus={async (ids, s, n) => { await axios.post('/api/redemptions/bulk/status', { ids, status: s, statusNote: n }); fetchBootstrapData(); }} />,
        manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={async (s) => { await axios.put('/api/settings/whatsapp', s); fetchBootstrapData(); return true; }} isReadOnly={isSupervisor} showToast={showToast} />,
        manajemenNomor: <ManajemenNomor currentUser={currentUser!} numbers={specialNumbers} 
            onSave={async (n) => { await axios.post('/api/special-numbers', n); fetchBootstrapData(); }} 
            onDelete={async (id) => { await axios.delete(`/api/special-numbers/${id}`); fetchBootstrapData(); }} 
            onStatusChange={async (id, s) => { await axios.put(`/api/special-numbers/${id}/status`, { isSold: s }); fetchBootstrapData(); }} 
            onBulkUpload={async (f) => { const fd = new FormData(); fd.append('file', f); await axios.post('/api/special-numbers/bulk', fd); fetchBootstrapData(); }} 
            adminUploadSpecialNumberBanner={async (f) => { const fd = new FormData(); fd.append('banner', f); await axios.post('/api/special-numbers/banner', fd); fetchBootstrapData(); }} 
            settings={whatsAppSettings} onSaveSettings={async (s) => { await axios.put('/api/settings/whatsapp', s); fetchBootstrapData(); }} />,
        manajemenTransaksi: <ManajemenTransaksi transactions={transactions} users={users} />,
        manajemenAktivitas: <ManajemenAktivitas transactions={transactions} redemptions={redemptionHistory} users={users} />,
    };

    const isPublic = ['landing', 'login', 'register'].includes(currentPage);
    if (isPublic && !currentUser) {
        if (currentPage === 'landing') return <LandingPage setCurrentPage={handlePageChange} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} loyaltyPrograms={loyaltyPrograms} redemptionHistory={redemptionHistory} />;
        if (currentPage === 'login') return <LoginPage handleLogin={handleLogin} setCurrentPage={handlePageChange} />;
        if (currentPage === 'register') return <RegisterPage handleRegister={async (fd) => { await axios.post('/api/auth/register', fd); fetchBootstrapData(); return true; }} setCurrentPage={handlePageChange} locations={locations} />;
    }

    if (!currentUser) { handlePageChange('landing'); return null; }

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