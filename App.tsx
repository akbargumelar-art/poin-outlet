
import React, { useState, useEffect, useCallback } from 'react';
import { User, Page, Transaction, Reward, Redemption, LoyaltyProgram, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, SpecialNumber, WhatsAppSettings, UserProfile, Location, UserRole } from './types';
import MainLayout from './components/layout/MainLayout';
import LoadingOverlay from './components/common/LoadingOverlay';
import Modal from './components/common/Modal';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import LandingPage from './pages/landing/LandingPage';
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

const SESSION_KEY = 'mitra_app_session';
const PAGE_KEY = 'mitra_app_last_page';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 1 Hari dalam milidetik

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [isGlobalLoading, setIsGlobalLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Memuat...');
    const [modal, setModal] = useState<{ show: boolean, title: string, content: React.ReactNode } | null>(null);

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>([]);
    const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
    const [runningPrograms, setRunningPrograms] = useState<RunningProgram[]>([]);
    const [rafflePrograms, setRafflePrograms] = useState<RaffleProgram[]>([]);
    const [couponRedemptions, setCouponRedemptions] = useState<CouponRedemption[]>([]);
    const [raffleWinners, setRaffleWinners] = useState<RaffleWinner[]>([]);
    const [specialNumbers, setSpecialNumbers] = useState<SpecialNumber[]>([]);
    const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings | null>(null);
    const [specialNumberBannerUrl, setSpecialNumberBannerUrl] = useState<string | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);

    const isSupervisor = currentUser?.role === 'supervisor';

    // --- Session Management ---
    const saveSession = (user: User) => {
        const sessionData = {
            user,
            expiry: Date.now() + SESSION_DURATION
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        setCurrentUser(user);
    };

    const clearSession = () => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(PAGE_KEY);
        setCurrentUser(null);
        setCurrentPage('landing');
    };

    // Check session on mount
    useEffect(() => {
        const storedSession = localStorage.getItem(SESSION_KEY);
        if (storedSession) {
            try {
                const parsedSession = JSON.parse(storedSession);
                if (Date.now() < parsedSession.expiry) {
                    // Session Valid
                    setCurrentUser(parsedSession.user);
                    
                    // Restore Last Page if available
                    const lastPage = localStorage.getItem(PAGE_KEY) as Page;
                    if (lastPage) {
                        setCurrentPage(lastPage);
                    } else {
                        // Default dashboard based on role
                        const role = parsedSession.user.role;
                        if (role === 'pelanggan') setCurrentPage('pelangganDashboard');
                        else if (role === 'operator') setCurrentPage('manajemenNomor');
                        else setCurrentPage('adminDashboard');
                    }
                } else {
                    // Session Expired
                    clearSession();
                }
            } catch (e) {
                console.error("Failed to parse session", e);
                clearSession();
            }
        }
    }, []);

    const fetchBootstrapData = useCallback(async () => {
        try {
            // Placeholder for data fetching - ensure these endpoints exist or replace with actual logic
            const responses = await Promise.all([
                fetch('/api/users').then(res => res.ok ? res.json() : []),
                fetch('/api/transactions').then(res => res.ok ? res.json() : []),
                fetch('/api/rewards').then(res => res.ok ? res.json() : []),
                fetch('/api/redemptions').then(res => res.ok ? res.json() : []),
                fetch('/api/loyalty-programs').then(res => res.ok ? res.json() : []),
                fetch('/api/running-programs').then(res => res.ok ? res.json() : []),
                fetch('/api/raffle-programs').then(res => res.ok ? res.json() : []),
                fetch('/api/coupon-redemptions').then(res => res.ok ? res.json() : []),
                fetch('/api/raffle-winners').then(res => res.ok ? res.json() : []),
                fetch('/api/special-numbers').then(res => res.ok ? res.json() : []),
                fetch('/api/whatsapp-settings').then(res => res.ok ? res.json() : null),
                fetch('/api/locations').then(res => res.ok ? res.json() : [])
            ]);

            setUsers(responses[0] || []);
            setTransactions(responses[1] || []);
            setRewards(responses[2] || []);
            setRedemptionHistory(responses[3] || []);
            setLoyaltyPrograms(responses[4] || []);
            setRunningPrograms(responses[5] || []);
            setRafflePrograms(responses[6] || []);
            setCouponRedemptions(responses[7] || []);
            setRaffleWinners(responses[8] || []);
            setSpecialNumbers(responses[9] || []);
            setWhatsAppSettings(responses[10]);
            setLocations(responses[11] || []);

        } catch (error) {
            console.error("Failed to fetch bootstrap data", error);
        }
    }, []);

    useEffect(() => {
        // Fetch public data even if not logged in
        fetchBootstrapData();
    }, [fetchBootstrapData]);

    const handlePageChange = (page: Page) => {
        setCurrentPage(page);
        // Persist page change if logged in
        if (currentUser) {
            localStorage.setItem(PAGE_KEY, page);
        }
    };

    const handleLogin = async (id: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password })
            });
            if (res.ok) {
                const user = await res.json();
                saveSession(user); // Save to localStorage
                
                const defaultPage = user.role === 'pelanggan' ? 'pelangganDashboard' : (user.role === 'operator' ? 'manajemenNomor' : 'adminDashboard');
                handlePageChange(defaultPage);
                
                fetchBootstrapData();
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    const handleRegister = async (formData: any): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                const user = await res.json();
                saveSession(user); // Save to localStorage
                handlePageChange('pelangganDashboard');
                fetchBootstrapData();
                return true;
            } else {
                const err = await res.json();
                setModal({ show: true, title: "Error", content: <p>{err.message}</p> });
                return false;
            }
        } catch (e) {
            setModal({ show: true, title: "Error", content: <p>Gagal terhubung ke server.</p> });
            return false;
        }
    };

    const handleLogout = () => {
        clearSession();
    };

    const handleTukarClick = async (reward: Reward) => {
        setIsGlobalLoading(true);
        setLoadingMessage('Memproses Penukaran...');
        try {
            const res = await fetch('/api/redemptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser?.id, rewardId: reward.id })
            });
            if (res.ok) {
                fetchBootstrapData();
                setModal({ show: true, title: "Sukses", content: <p>Penukaran berhasil diajukan.</p> });
                // Update local user points optimistically or wait for fetchBootstrapData
            } else {
                const err = await res.json();
                setModal({ show: true, title: "Error", content: <p>{err.message}</p> });
            }
        } catch (e) {
            setModal({ show: true, title: "Error", content: <p>Gagal memproses penukaran.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const updateUserProfile = async (profile: UserProfile, photoFile: File | null) => {
        setIsGlobalLoading(true);
        setLoadingMessage('Mengupdate Profil...');
        try {
            const formData = new FormData();
            formData.append('profile', JSON.stringify(profile));
            if (photoFile) formData.append('photo', photoFile);

            const res = await fetch(`/api/users/${currentUser?.id}`, {
                method: 'PUT',
                body: formData
            });
            if (res.ok) {
                await fetchBootstrapData();
                // Update current user locally to reflect changes immediately
                const updatedUser = await res.json();
                // Important: Update localStorage too so it persists on refresh
                saveSession(updatedUser); 
                
                setModal({ show: true, title: "Sukses", content: <p>Profil berhasil diperbarui.</p> });
            } else {
                throw new Error('Gagal update profil');
            }
        } catch (e) {
            setModal({ show: true, title: "Error", content: <p>Terjadi kesalahan saat mengupdate profil.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const handleChangePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser?.id, oldPassword, newPassword })
            });
            if (res.ok) {
                setModal({ show: true, title: "Sukses", content: <p>Password berhasil diubah.</p> });
                return true;
            } else {
                const err = await res.json();
                setModal({ show: true, title: "Error", content: <p>{err.message}</p> });
                return false;
            }
        } catch (e) {
            return false;
        }
    };

    // Admin Handlers
    const adminAddUser = async (user: User) => {
        setIsGlobalLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            if (res.ok) {
                fetchBootstrapData();
                setModal({ show: true, title: "Sukses", content: <p>User berhasil ditambahkan.</p> });
            } else {
                throw new Error();
            }
        } catch(e) {
            setModal({ show: true, title: "Error", content: <p>Gagal menambah user.</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    };

    const adminUpdateUserLevel = async (userId: string, level: string) => {
        setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}/level`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level })
            });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminResetPassword = async (userId: string) => {
        setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
            if (res.ok) setModal({ show: true, title: "Sukses", content: <p>Password berhasil direset.</p> });
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const saveProgram = async (programData: any, photoFile: File | null) => {
        setIsGlobalLoading(true);
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(programData));
            if (photoFile) formData.append('photo', photoFile);
            
            const url = programData.id ? `/api/running-programs/${programData.id}` : '/api/running-programs';
            const method = programData.id ? 'PUT' : 'POST';
            
            const res = await fetch(url, { method, body: formData });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const adminDeleteProgram = async (id: number) => {
         setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/running-programs/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminBulkUpdateProgramProgress = async (id: number, file: File) => {
        setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/api/running-programs/${id}/progress`, { method: 'POST', body: formData });
            if(res.ok) {
                 setModal({ show: true, title: "Sukses", content: <p>Progres berhasil diupdate.</p> });
                 fetchBootstrapData();
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminUpdateProgramParticipants = async (id: number, ids: string[]) => {
        setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/running-programs/${id}/participants`, { 
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ userIds: ids })
            });
            if(res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminBulkAddProgramParticipants = async (id: number, file: File) => {
         setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch(`/api/running-programs/${id}/participants/bulk`, { method: 'POST', body: formData });
            if(res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminUpdateLoyaltyProgram = async (program: LoyaltyProgram) => {
        setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/loyalty-programs/${program.level}`, { 
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(program)
            });
            if(res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminAddTransaction = async (data: any) => {
        setIsGlobalLoading(true);
        try {
             const res = await fetch('/api/transactions', { 
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            if(res.ok) {
                setModal({ show: true, title: "Sukses", content: <p>Transaksi berhasil ditambahkan.</p> });
                fetchBootstrapData();
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminBulkAddTransactions = async (file: File) => {
         setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/transactions/bulk', { method: 'POST', body: formData });
            const result = await res.json();
            if(res.ok) {
                 setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });
                 fetchBootstrapData();
            } else {
                 setModal({ show: true, title: "Gagal", content: <p>{result.message}</p> });
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const adminUpdatePointsManual = async (userId: string, points: number, action: 'tambah'|'kurang') => {
        setIsGlobalLoading(true);
        try {
             const res = await fetch(`/api/users/${userId}/points`, { 
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ points, action })
            });
            if(res.ok) {
                setModal({ show: true, title: "Sukses", content: <p>Poin berhasil diupdate.</p> });
                fetchBootstrapData();
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminBulkUpdateLevels = async (file: File) => {
         setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/users/levels/bulk', { method: 'POST', body: formData });
            if(res.ok) {
                 setModal({ show: true, title: "Sukses", content: <p>Level berhasil diupdate.</p> });
                 fetchBootstrapData();
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const saveReward = async (rewardData: any, photoFile: File | null) => {
        setIsGlobalLoading(true);
        try {
            const formData = new FormData();
            formData.append('data', JSON.stringify(rewardData));
            if (photoFile) formData.append('photo', photoFile);
            
            const url = rewardData.id ? `/api/rewards/${rewardData.id}` : '/api/rewards';
            const method = rewardData.id ? 'PUT' : 'POST';
            
            const res = await fetch(url, { method, body: formData });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminDeleteReward = async (id: number) => {
         setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/rewards/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const adminReorderRewards = async (order: any): Promise<boolean> => {
        try {
            const res = await fetch('/api/rewards/reorder', { 
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ order })
            });
            if (res.ok) {
                fetchBootstrapData();
                return true;
            }
            return false;
        } catch(e) { return false; }
    };

    const saveRaffleProgram = async (program: any) => {
        setIsGlobalLoading(true);
        try {
            const url = program.id ? `/api/raffle-programs/${program.id}` : '/api/raffle-programs';
            const method = program.id ? 'PUT' : 'POST';
             const res = await fetch(url, { 
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(program)
            });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const deleteRaffleProgram = async (id: number) => {
         setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/raffle-programs/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminSaveWhatsAppSettings = async (settings: WhatsAppSettings): Promise<boolean> => {
        setIsGlobalLoading(true);
        try {
             const res = await fetch('/api/whatsapp-settings', { 
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setModal({ show: true, title: "Sukses", content: <p>Pengaturan disimpan.</p> });
                fetchBootstrapData();
                return true;
            }
            return false;
        } catch(e) { return false; } finally { setIsGlobalLoading(false); }
    };

    const adminManageSpecialNumber = async (number: any) => {
        setIsGlobalLoading(true);
        try {
            const url = number.id ? `/api/special-numbers/${number.id}` : '/api/special-numbers';
            const method = number.id ? 'PUT' : 'POST';
             const res = await fetch(url, { 
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(number)
            });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const adminDeleteSpecialNumber = async (id: number) => {
         setIsGlobalLoading(true);
        try {
            const res = await fetch(`/api/special-numbers/${id}`, { method: 'DELETE' });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };
    
    const adminUpdateSpecialNumberStatus = async (id: number, isSold: boolean) => {
         setIsGlobalLoading(true);
        try {
             const res = await fetch(`/api/special-numbers/${id}/status`, { 
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ isSold })
            });
            if (res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminBulkUploadNumbers = async (file: File) => {
         setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/special-numbers/bulk', { method: 'POST', body: formData });
            if(res.ok) {
                 setModal({ show: true, title: "Sukses", content: <p>Nomor berhasil diupload.</p> });
                 fetchBootstrapData();
            }
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminUploadSpecialNumberBanner = async (file: File) => {
        setIsGlobalLoading(true);
        try {
             const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/special-numbers/banner', { method: 'POST', body: formData });
            if(res.ok) fetchBootstrapData();
        } catch(e) { console.error(e); } finally { setIsGlobalLoading(false); }
    };

    const adminUpdateRedemptionStatus = useCallback(async (redemptionId: number, status: string, statusNote: string, photoFile?: File | null) => {
        setIsGlobalLoading(true);
        setLoadingMessage('Mengupdate Status Penukaran...');
        try {
            const response = await fetch(`/api/redemptions/${redemptionId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, statusNote }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);

            // Upload photo if provided
            if (photoFile) {
                setLoadingMessage('Mengunggah Dokumentasi...');
                const formData = new FormData();
                formData.append('photo', photoFile);
                const uploadResponse = await fetch(`/api/redemptions/${redemptionId}/documentation`, {
                    method: 'POST',
                    body: formData,
                });
                if (!uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    throw new Error(uploadResult.message || 'Status diperbarui, namun gagal mengunggah foto.');
                }
            }

            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Status penukaran berhasil diperbarui.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        } finally {
            setIsGlobalLoading(false);
        }
    }, [fetchBootstrapData]);

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


    const pageMap: {[key in Page]?: React.ReactNode} = {
        pelangganDashboard: <PelangganDashboard currentUser={currentUser!} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={handlePageChange} raffleWinners={raffleWinners} redemptionHistory={redemptionHistory} />,
        historyPembelian: <HistoryPembelian currentUser={currentUser!} transactions={transactions} redemptionHistory={redemptionHistory} />,
        pencapaianProgram: <PencapaianProgram currentUser={currentUser!} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
        tukarPoin: <TukarPoin currentUser={currentUser!} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
        editProfile: <EditProfilePage currentUser={currentUser!} updateUserProfile={updateUserProfile} handleLogout={handleLogout} handleChangePassword={handleChangePassword} />,
        adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms} specialNumbers={specialNumbers} redemptions={redemptionHistory} />,
        manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} setCurrentPage={handlePageChange} isReadOnly={isSupervisor} loyaltyPrograms={loyaltyPrograms} adminUpdateUserLevel={adminUpdateUserLevel} adminResetPassword={adminResetPassword} />,
        tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
        manajemenProgram: <ManajemenProgram programs={runningPrograms} allUsers={users.filter(u => u.role === 'pelanggan')} onSave={saveProgram} onDelete={adminDeleteProgram} adminBulkUpdateProgramProgress={adminBulkUpdateProgramProgress} adminUpdateProgramParticipants={adminUpdateProgramParticipants} adminBulkAddProgramParticipants={adminBulkAddProgramParticipants} isReadOnly={isSupervisor} />,
        manajemenPoin: <ManajemenPoin currentUser={currentUser!} users={users.filter(u=>u.role==='pelanggan')} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={adminBulkAddTransactions} adminUpdatePointsManual={adminUpdatePointsManual} adminBulkUpdateLevels={adminBulkUpdateLevels} isReadOnly={isSupervisor} />,
        manajemenHadiah: <ManajemenHadiah rewards={rewards} onSave={saveReward} deleteReward={adminDeleteReward} isReadOnly={isSupervisor} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminReorderRewards={adminReorderRewards} />,
        manajemenUndian: <ManajemenUndian users={users.filter(u => u.role === 'pelanggan')} programs={rafflePrograms} redemptions={couponRedemptions} onSave={saveRaffleProgram} onDelete={deleteRaffleProgram} isReadOnly={isSupervisor} />,
        manajemenPenukaran: <ManajemenPenukaran redemptions={redemptionHistory} users={users} isReadOnly={isSupervisor} adminUpdateRedemptionStatus={adminUpdateRedemptionStatus} adminBulkUpdateRedemptionStatus={adminBulkUpdateRedemptionStatus} />,
        manajemenTransaksi: <ManajemenTransaksi transactions={transactions} users={users} />,
        manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={adminSaveWhatsAppSettings} isReadOnly={isSupervisor} />,
        nomorSpesial: <NomorSpesialPage currentUser={currentUser!} numbers={specialNumbers.filter(n => !n.isSold)} recipientNumber={whatsAppSettings?.specialNumberRecipient || ''} specialNumberBannerUrl={specialNumberBannerUrl} />,
        manajemenNomor: <ManajemenNomor currentUser={currentUser!} numbers={specialNumbers} onSave={adminManageSpecialNumber} onDelete={adminDeleteSpecialNumber} onStatusChange={adminUpdateSpecialNumberStatus} onBulkUpload={adminBulkUploadNumbers} adminUploadSpecialNumberBanner={adminUploadSpecialNumberBanner} settings={whatsAppSettings} onSaveSettings={adminSaveWhatsAppSettings} />,
    };

    const pageContent = pageMap[currentPage] || <div>Halaman tidak ditemukan.</div>;

    return (
        <>
           <LoadingOverlay isVisible={isGlobalLoading} message={loadingMessage} />
           {modal && modal.show && (
               <Modal show={modal.show} onClose={() => setModal(null)} title={modal.title}>
                   {modal.content}
               </Modal>
           )}
           
           {!currentUser ? (
               currentPage === 'register' ? <RegisterPage handleRegister={handleRegister} setCurrentPage={setCurrentPage} locations={locations} /> :
               currentPage === 'login' ? <LoginPage handleLogin={handleLogin} setCurrentPage={setCurrentPage} /> :
               <LandingPage setCurrentPage={setCurrentPage} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} loyaltyPrograms={loyaltyPrograms} redemptionHistory={redemptionHistory} />
           ) : (
               <MainLayout currentUser={currentUser} currentPage={currentPage} setCurrentPage={handlePageChange} handleLogout={handleLogout}>
                   {pageContent}
               </MainLayout>
           )}
        </>
    );
}

export default App;
