import React, { useState, useEffect, useCallback } from 'react';
import { Page, User, UserProfile, Reward, Redemption, LoyaltyProgram, Transaction, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, Location, PrizeCategory, WhatsAppSettings, SpecialNumber } from './types';

import Modal from './components/common/Modal';
import MainLayout from './components/layout/MainLayout';
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


function App() {
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [modal, setModal] = useState({ show: false, content: <></>, title: '' });
    const [isLoading, setIsLoading] = useState(true);

    // State for all application data, will be fetched from backend
    const [users, setUsers] = useState<User[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>([]);
    const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>([]);
    const [runningPrograms, setRunningPrograms] = useState<RunningProgram[]>([]);
    const [rafflePrograms, setRafflePrograms] = useState<RaffleProgram[]>([]);
    const [couponRedemptions, setCouponRedemptions] = useState<CouponRedemption[]>([]);
    const [raffleWinners, setRaffleWinners] = useState<RaffleWinner[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [whatsAppSettings, setWhatsAppSettings] = useState<WhatsAppSettings | null>(null);
    const [specialNumbers, setSpecialNumbers] = useState<SpecialNumber[]>([]);


    const fetchBootstrapData = useCallback(async () => {
        try {
            const response = await fetch('/api/bootstrap');
            if (!response.ok) throw new Error('Failed to fetch initial data');
            const data = await response.json();
            setUsers(data.users || []);
            setTransactions(data.transactions || []);
            setRewards(data.rewards || []);
            setRedemptionHistory(data.redemptionHistory || []);
            setLoyaltyPrograms(data.loyaltyPrograms || []);
            setRunningPrograms(data.runningPrograms || []);
            setRafflePrograms(data.rafflePrograms || []);
            setCouponRedemptions(data.couponRedemptions || []);
            setRaffleWinners(data.raffleWinners || []);
            setLocations(data.locations || []);
            setWhatsAppSettings(data.whatsAppSettings || null);
            setSpecialNumbers(data.specialNumbers || []);
        } catch (error) {
            console.error("Bootstrap failed:", error);
            setModal({ show: true, title: "Error", content: <p>Gagal memuat data dari server. Silakan coba lagi nanti.</p> });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkSessionAndBootstrap = async () => {
            // Check for a logged in user in localStorage
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                try {
                    const user: User = JSON.parse(storedUser);
                    setCurrentUser(user);
                    setCurrentPage(user.role === 'pelanggan' ? 'pelangganDashboard' : 'adminDashboard');
                } catch (e) {
                    console.error("Failed to parse stored user data, clearing session.", e);
                    localStorage.removeItem('currentUser');
                }
            }
            // Always fetch fresh data from the server, which also handles the loading state.
            await fetchBootstrapData();
        };

        checkSessionAndBootstrap();
    }, [fetchBootstrapData]);
    
    // --- API HANDLERS ---
    const handleLogin = useCallback(async (id: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password })
            });
            const data = await response.json();
            if (response.ok) {
                setCurrentUser(data);
                localStorage.setItem('currentUser', JSON.stringify(data));
                setCurrentPage(data.role === 'pelanggan' ? 'pelangganDashboard' : 'adminDashboard');
                return true;
            } else {
                throw new Error(data.message || 'Login gagal');
            }
        } catch (error: any) {
            console.error("Login failed:", error);
            return false;
        }
    }, []);
    
    const handleRegister = useCallback(async (formData: any): Promise<boolean> => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await response.json();
            if (response.ok) {
                setCurrentUser(data);
                localStorage.setItem('currentUser', JSON.stringify(data));
                await fetchBootstrapData(); // Refresh all data
                setCurrentPage('pelangganDashboard');
                setModal({ show: true, title: 'Registrasi Berhasil', content: <p>Selamat datang! Akun Anda telah berhasil dibuat.</p> });
                return true;
            } else {
                throw new Error(data.message || 'Registrasi gagal');
            }
        } catch (error: any) {
            setModal({ show: true, title: 'Registrasi Gagal', content: <p>{error.message}</p> });
            return false;
        }
    }, [fetchBootstrapData]);
    
    const updateUserProfile = useCallback(async (profile: UserProfile, photoFile: File | null) => {
        if (!currentUser) return;
        try {
            const profileResponse = await fetch(`/api/users/${currentUser.id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });
             if (!profileResponse.ok) {
                const errorData = await profileResponse.json();
                throw new Error(errorData.message || 'Gagal memperbarui profil.');
            }
            let updatedUserFromServer: User = await profileResponse.json();
    
            if (photoFile) {
                const formData = new FormData();
                formData.append('profilePhoto', photoFile);
                const photoResponse = await fetch(`/api/users/${currentUser.id}/photo`, {
                    method: 'POST',
                    body: formData,
                });
                if (!photoResponse.ok) {
                    const errorData = await photoResponse.json();
                    throw new Error(`Profil teks berhasil disimpan, tetapi: ${errorData.message || 'Gagal mengunggah foto.'}`);
                }
                const photoData = await photoResponse.json();
                updatedUserFromServer.profile.photoUrl = photoData.photoUrl;
            }
            
            setCurrentUser(updatedUserFromServer);
            localStorage.setItem('currentUser', JSON.stringify(updatedUserFromServer));
            setUsers(users.map(u => u.id === currentUser.id ? updatedUserFromServer : u));
    
            setModal({ show: true, title: "Berhasil", content: <p className="text-center text-green-600">Profil berhasil diperbarui!</p> });
        } catch (error: any) {
             setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [currentUser, users]);

    const handleChangePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            const response = await fetch(`/api/users/${currentUser.id}/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword, newPassword }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Gagal mengubah password.');
            }
            setModal({ show: true, title: "Berhasil", content: <p className="text-center text-green-600">{data.message}</p> });
            return true;
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
            return false;
        }
    }, [currentUser]);

    const handleLogout = useCallback(() => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        setCurrentPage('landing');
    }, []);
    
    const redeemReward = useCallback(async (reward: Reward) => {
        if (!currentUser) return;
        try {
            const isKupon = reward.name.includes('Kupon Undian');
            const response = await fetch('/api/redemptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, rewardId: reward.id, pointsSpent: reward.points, isKupon })
            });

            const data = await response.json();

            if(!response.ok) {
                throw new Error(data.message || "Gagal melakukan penukaran");
            }

            const updatedUser: User = data.updatedUser;
            setCurrentUser(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            
            setUsers(prevUsers => prevUsers.map(u => u.id === updatedUser.id ? updatedUser : u));

            // Partially refresh data instead of full bootstrap for performance
            fetch('/api/rewards').then(res => res.json()).then(setRewards);
            fetch('/api/redemptions').then(res => res.json()).then(setRedemptionHistory);


            setModal({ show: true, title: 'Sukses!', content: <p className="text-center text-green-600">Penukaran <b>{reward.name}</b> berhasil.</p> });
        } catch (error: any) {
             setModal({show: true, title: "Gagal", content: <p>{error.message}</p>});
        }
    }, [currentUser]);
    
    const handleTukarClick = useCallback((reward: Reward) => {
        if (!currentUser || !currentUser.points) return;
        if (reward.stock === 0) return;
        if (currentUser.points < reward.points) {
            setModal({show: true, title: "Poin Tidak Cukup", content: <p>Maaf, poin Anda tidak cukup.</p>})
            return;
        }
        setModal({show: true, title: "Konfirmasi", content: <div><p className="text-center mb-4">Tukar {reward.points.toLocaleString('id-ID')} poin untuk {reward.name}?</p><div className="flex justify-center gap-4"><button onClick={() => setModal({show: false, title:'', content:<></>})} className="neu-button">Batal</button><button onClick={() => { setModal({show: false, title:'', content:<></>}); redeemReward(reward); }} className="neu-button text-red-600">Ya</button></div></div>});
    }, [currentUser, redeemReward]);
    
    const adminAddUser = useCallback(async (newUser: User) => {
        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.message || "Gagal menambahkan user.");
            }
    
            await fetchBootstrapData();
            
            setModal({ show: true, title: "Sukses", content: <p>User baru <b>{data.profile.nama}</b> berhasil ditambahkan ke database.</p> });
            setCurrentPage('manajemenPelanggan');
    
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminAddTransaction = useCallback(async (data: Omit<Transaction, 'id' | 'pointsEarned' > & {totalPembelian: number}) => {
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            if(!response.ok) throw new Error(result.message);
            await fetchBootstrapData(); // Refresh all data
            setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Transaksi berhasil ditambahkan. Mitra mendapat <b>{result.pointsEarned}</b> poin.</p> });
        } catch(error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p>});
        }
    }, [fetchBootstrapData]);

    const saveReward = useCallback(async (rewardData: Omit<Reward, 'id'> & { id?: number }, photoFile: File | null) => {
        try {
            const method = rewardData.id ? 'PUT' : 'POST';
            const url = rewardData.id ? `/api/rewards/${rewardData.id}` : '/api/rewards';
            
            const textResponse = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(rewardData)
            });

            if (!textResponse.ok) {
                const error = await textResponse.json();
                throw new Error(error.message || 'Gagal menyimpan data hadiah.');
            }
            
            const savedReward = await textResponse.json();

            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);
                const photoResponse = await fetch(`/api/rewards/${savedReward.id}/photo`, {
                    method: 'POST',
                    body: formData,
                });
                if (!photoResponse.ok) {
                    const errorData = await photoResponse.json();
                    throw new Error(`Data teks disimpan, tapi: ${errorData.message || 'gagal mengunggah foto.'}`);
                }
            }
            
            setModal({ show: true, title: "Sukses", content: <p>Data hadiah berhasil disimpan.</p> });
            await fetchBootstrapData();
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);
    
    const adminDeleteReward = useCallback(async (rewardId: number) => {
        try {
            const response = await fetch(`/api/rewards/${rewardId}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });

        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminUpdateLoyaltyProgram = useCallback(async (program: LoyaltyProgram) => {
        try {
            const response = await fetch(`/api/loyalty-programs/${program.level}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(program)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Level <b>{program.level}</b> berhasil diperbarui.</p> });

        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminBulkAddTransactions = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('transactionsFile', file);
            
            const response = await fetch('/api/transactions/bulk', {
                method: 'POST',
                body: formData,
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            
            setModal({
                show: true,
                title: "Upload Selesai",
                content: (
                    <div>
                        <p>{result.message}</p>
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4 text-xs text-left bg-red-50 p-2 rounded max-h-40 overflow-y-auto">
                                <strong>Detail Kegagalan:</strong>
                                <ul className="list-disc pl-5">
                                    {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);
    
    const adminUpdatePointsManual = useCallback(async (userId: string, points: number, action: 'tambah' | 'kurang') => {
        try {
            const response = await fetch(`/api/users/${userId}/points`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points, action })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Poin berhasil diperbarui. Poin baru: {result.newPoints.toLocaleString('id-ID')}</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const saveProgram = useCallback(async (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number; prizeCategory: PrizeCategory; prizeDescription: string; }, photoFile: File | null) => {
        try {
            const method = programData.id ? 'PUT' : 'POST';
            const url = programData.id ? `/api/programs/${programData.id}` : '/api/programs';

            const textResponse = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programData)
            });
            if (!textResponse.ok) {
                 const error = await textResponse.json();
                throw new Error(error.message || 'Gagal menyimpan data program.');
            }
            const savedProgram = await textResponse.json();

            if (photoFile) {
                const formData = new FormData();
                formData.append('photo', photoFile);
                const photoResponse = await fetch(`/api/programs/${savedProgram.id}/photo`, {
                    method: 'POST',
                    body: formData
                });
                if (!photoResponse.ok) {
                    const errorData = await photoResponse.json();
                    throw new Error(`Data program disimpan, tapi: ${errorData.message || 'foto gagal diunggah.'}`);
                }
            }
            
            setModal({ show: true, title: "Sukses", content: <p>Data program berhasil disimpan.</p> });
            await fetchBootstrapData();
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminDeleteProgram = useCallback(async (programId: number) => {
        try {
            const response = await fetch(`/api/programs/${programId}`, {
                method: 'DELETE',
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });

        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminUpdateProgramParticipants = useCallback(async (programId: number, participantIds: string[]) => {
        try {
            const response = await fetch(`/api/programs/${programId}/participants`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ participantIds }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || 'Gagal memperbarui daftar peserta.');
            }
            setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });
            await fetchBootstrapData();
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminBulkUpdateProgramProgress = useCallback(async (programId: number, file: File) => {
        try {
            const formData = new FormData();
            formData.append('progressFile', file);
    
            const response = await fetch(`/api/programs/${programId}/progress`, {
                method: 'POST',
                body: formData,
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.message || 'Gagal mengunggah file progres.');
            }
    
            setModal({
                show: true,
                title: "Upload Selesai",
                content: <p className="text-center">{result.message}</p>
            });
            
            await fetchBootstrapData(); // Refresh data to show new progress
    
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const saveRaffleProgram = useCallback(async (program: Omit<RaffleProgram, 'id'> & { id?: number }) => {
        try {
            const method = program.id ? 'PUT' : 'POST';
            const url = program.id ? `/api/raffle-programs/${program.id}` : '/api/raffle-programs';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(program),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: 'Sukses', content: <p>Program undian berhasil disimpan.</p> });
        } catch (error: any) {
            setModal({ show: true, title: 'Error', content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);
    
    const deleteRaffleProgram = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/raffle-programs/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: 'Sukses', content: <p>Program undian berhasil dihapus.</p> });
        } catch (error: any) {
            setModal({ show: true, title: 'Error', content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminSaveWhatsAppSettings = useCallback(async (settings: WhatsAppSettings) => {
        try {
            const response = await fetch('/api/settings/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Pengaturan notifikasi WhatsApp berhasil disimpan.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);
    
    const adminUpdateUserLevel = useCallback(async (userId: string, level: string) => {
        try {
            const response = await fetch(`/api/users/${userId}/level`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ level })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Level untuk user <b>{result.profile.nama}</b> berhasil diubah menjadi <b>{result.level}</b>.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminBulkUpdateLevels = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('levelFile', file);

            const response = await fetch('/api/users/bulk-level-update', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) throw result;

            await fetchBootstrapData();

            setModal({
                show: true,
                title: "Upload Selesai",
                content: (
                    <div>
                        <p>{result.message}</p>
                    </div>
                )
            });
        } catch (error: any) {
            setModal({
                show: true,
                title: "Error Upload",
                content: (
                    <div>
                        <p>{error.message || "Terjadi kesalahan yang tidak diketahui."}</p>
                        {error.errors && Array.isArray(error.errors) && error.errors.length > 0 && (
                             <div className="mt-4 text-xs text-left bg-red-50 p-2 rounded max-h-40 overflow-y-auto">
                                <strong>Detail Kegagalan:</strong>
                                <ul className="list-disc pl-5">
                                    {error.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            });
        }
    }, [fetchBootstrapData]);

    const adminManageSpecialNumber = useCallback(async (numberData: Omit<SpecialNumber, 'id' | 'isSold'> & { id?: number }) => {
        try {
            const method = numberData.id ? 'PUT' : 'POST';
            const url = numberData.id ? `/api/special-numbers/${numberData.id}` : '/api/special-numbers';
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(numberData)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Nomor spesial berhasil disimpan.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminDeleteSpecialNumber = useCallback(async (id: number) => {
        try {
            const response = await fetch(`/api/special-numbers/${id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>{result.message}</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminUpdateSpecialNumberStatus = useCallback(async (id: number, isSold: boolean) => {
        try {
            const response = await fetch(`/api/special-numbers/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isSold })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message);
            await fetchBootstrapData();
            setModal({ show: true, title: "Sukses", content: <p>Status nomor berhasil diperbarui.</p> });
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    }, [fetchBootstrapData]);

    const adminBulkUploadNumbers = useCallback(async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('specialNumbersFile', file);
            const response = await fetch('/api/special-numbers/bulk', {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();
            if (!response.ok) throw result;
            await fetchBootstrapData();
            setModal({
                show: true,
                title: "Upload Selesai",
                content: (
                    <div>
                        <p>{result.message}</p>
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-4 text-xs text-left bg-red-50 p-2 rounded max-h-40 overflow-y-auto">
                                <strong>Detail Kegagalan:</strong>
                                <ul className="list-disc pl-5">
                                    {result.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            });
        } catch (error: any) {
            setModal({ show: true, title: "Error Upload", content: <p>{error.message || "Terjadi kesalahan."}</p> });
        }
    }, [fetchBootstrapData]);

    if (isLoading) {
        return <div className="min-h-screen flex justify-center items-center neu-bg"><p className="text-xl font-semibold text-gray-600">Memuat Aplikasi...</p></div>
    }

    const renderPage = () => {
        if (!currentUser) {
            switch (currentPage) {
                case 'login':
                    return <LoginPage handleLogin={handleLogin} setCurrentPage={setCurrentPage} />;
                case 'register':
                    return <RegisterPage handleRegister={handleRegister} setCurrentPage={setCurrentPage} locations={locations} />;
                case 'landing':
                default:
                    return <LandingPage setCurrentPage={setCurrentPage} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} loyaltyPrograms={loyaltyPrograms} />;
            }
        }
        
        const isReadOnly = currentUser.role === 'supervisor';
        const restrictedPagesForSupervisor: Page[] = ['tambahUser', 'manajemenPoin', 'manajemenNotifikasi'];
        if (isReadOnly && restrictedPagesForSupervisor.includes(currentPage)) {
             setCurrentPage('adminDashboard');
        }


        const pageMap: {[key in Page]?: React.ReactNode} = {
            pelangganDashboard: <PelangganDashboard currentUser={currentUser} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={setCurrentPage} raffleWinners={raffleWinners} />,
            historyPembelian: <HistoryPembelian currentUser={currentUser} transactions={transactions} redemptionHistory={redemptionHistory} />,
            pencapaianProgram: <PencapaianProgram currentUser={currentUser} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
            tukarPoin: <TukarPoin currentUser={currentUser} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
            editProfile: <EditProfilePage currentUser={currentUser} updateUserProfile={updateUserProfile} handleLogout={handleLogout} handleChangePassword={handleChangePassword} />,
            adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms}/>,
            manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} setCurrentPage={setCurrentPage} isReadOnly={isReadOnly} loyaltyPrograms={loyaltyPrograms} adminUpdateUserLevel={adminUpdateUserLevel} />,
            tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
            manajemenProgram: <ManajemenProgram programs={runningPrograms} allUsers={users.filter(u => u.role === 'pelanggan')} onSave={saveProgram} onDelete={adminDeleteProgram} adminBulkUpdateProgramProgress={adminBulkUpdateProgramProgress} adminUpdateProgramParticipants={adminUpdateProgramParticipants} isReadOnly={isReadOnly} />,
            manajemenPoin: <ManajemenPoin users={users.filter(u=>u.role==='pelanggan')} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={adminBulkAddTransactions} adminUpdatePointsManual={adminUpdatePointsManual} adminBulkUpdateLevels={adminBulkUpdateLevels} isReadOnly={isReadOnly} />,
            manajemenHadiah: <ManajemenHadiah rewards={rewards} onSave={saveReward} deleteReward={adminDeleteReward} isReadOnly={isReadOnly} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} />,
            manajemenUndian: <ManajemenUndian users={users.filter(u => u.role === 'pelanggan')} programs={rafflePrograms} redemptions={couponRedemptions} onSave={saveRaffleProgram} onDelete={deleteRaffleProgram} isReadOnly={isReadOnly} />,
            manajemenPenukaran: <ManajemenPenukaran redemptions={redemptionHistory} isReadOnly={isReadOnly} />,
            manajemenNotifikasi: <ManajemenNotifikasi settings={whatsAppSettings} onSave={adminSaveWhatsAppSettings} isReadOnly={isReadOnly} />,
            nomorSpesial: <NomorSpesialPage currentUser={currentUser} numbers={specialNumbers.filter(n => !n.isSold)} recipientNumber={whatsAppSettings?.specialNumberRecipient || ''} />,
            manajemenNomor: <ManajemenNomor numbers={specialNumbers} onSave={adminManageSpecialNumber} onDelete={adminDeleteSpecialNumber} onStatusChange={adminUpdateSpecialNumberStatus} onBulkUpload={adminBulkUploadNumbers} />,
        };
        const pageContent = pageMap[currentPage] || <div>Halaman tidak ditemukan.</div>;

        return <MainLayout currentUser={currentUser} currentPage={currentPage} setCurrentPage={setCurrentPage} handleLogout={handleLogout}>{pageContent}</MainLayout>
    };

    return (
        <>
            {renderPage()}
            <Modal show={modal.show} onClose={() => setModal({show: false, title:'', content:<></>})} title={modal.title}>{modal.content}</Modal>
        </>
    );
}

export default App;