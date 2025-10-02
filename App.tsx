
import React, { useState, useEffect } from 'react';
import { Page, User, UserProfile, Reward, Redemption, LoyaltyProgram, Transaction, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, Location } from './types';

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

// Define the base URL for your API
const API_URL = '/api'; // Use relative path for same-origin deployment

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [modal, setModal] = useState({ show: false, content: <></>, title: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for all application data, fetched from backend
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

    const fetchBootstrapData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_URL}/bootstrap`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal mengambil data dari server.');
            }
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
            setError(null);
        } catch (err: any) {
            console.error("Bootstrap error:", err);
            setError(err.message || 'Tidak dapat terhubung ke server.');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Fetch initial data from backend
    useEffect(() => {
        fetchBootstrapData();
    }, []);
    
    // --- API HANDLERS ---
    const handleLogin = async (id: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login gagal');
            }
            const user = await response.json();
            setCurrentUser(user);
            setCurrentPage(user.role === 'pelanggan' ? 'pelangganDashboard' : 'adminDashboard');
            return true;
        } catch (err) {
            console.error(err);
            return false;
        }
    };
    
    const handleRegister = async (formData: any) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
             if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registrasi gagal');
            }
            const newUser = await response.json();
            setUsers([...users, newUser]);
            setCurrentUser(newUser); // Auto-login after registration
            setCurrentPage('pelangganDashboard');
            setModal({ show: true, title: 'Registrasi Berhasil', content: <p>Selamat datang! Akun Anda telah berhasil dibuat.</p> });
            return true;
        } catch (err: any) {
             setModal({ show: true, title: 'Registrasi Gagal', content: <p>{err.message}</p> });
            return false;
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentPage('landing');
    };
    
    const redeemReward = async (reward: Reward) => {
        if (!currentUser) return;
        try {
            const isKupon = reward.name.includes('Kupon Undian');
            const response = await fetch(`${API_URL}/redemptions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: currentUser.id,
                    rewardId: reward.id,
                    pointsSpent: reward.points,
                    isKupon
                }),
            });

             if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.message || 'Gagal menukar hadiah');
             }

            // Optimistic UI update
            const updatedUser: User = { 
                ...currentUser, 
                points: (currentUser.points || 0) - reward.points,
                kuponUndian: isKupon ? (currentUser.kuponUndian || 0) + 1 : currentUser.kuponUndian,
            };
            setCurrentUser(updatedUser);
            setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
            if (!isKupon) {
                 setRewards(rewards.map(r => r.id === reward.id ? {...r, stock: r.stock - 1 } : r));
            }
            // You might want to refetch history or add it manually
            setModal({ show: true, title: 'Sukses!', content: <p className="text-center text-green-600">Penukaran <b>{reward.name}</b> berhasil.</p> });
            await fetchBootstrapData(); // Refetch all data to ensure consistency

        } catch (error: any) {
            console.error(error);
            setModal({ show: true, title: 'Error', content: <p>{error.message}</p> });
        }
    };
    
    const handleTukarClick = (reward: Reward) => {
        if (!currentUser || !currentUser.points) return;
        if (reward.stock === 0) return;
        if (currentUser.points < reward.points) {
            setModal({show: true, title: "Poin Tidak Cukup", content: <p>Maaf, poin Anda tidak cukup.</p>})
            return;
        }
        setModal({show: true, title: "Konfirmasi", content: <div><p className="text-center mb-4">Tukar {reward.points.toLocaleString('id-ID')} poin untuk {reward.name}?</p><div className="flex justify-center gap-4"><button onClick={() => setModal({show: false, title:'', content:<></>})} className="neu-button">Batal</button><button onClick={() => { setModal({show: false, title:'', content:<></>}); redeemReward(reward); }} className="neu-button text-red-600">Ya</button></div></div>});
    };
    
    const updateUserProfile = async (updatedProfile: UserProfile) => {
        if(!currentUser) return;
        try {
             const response = await fetch(`${API_URL}/users/${currentUser.id}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProfile),
            });
            if (!response.ok) throw new Error('Gagal memperbarui profil');
            
            const updatedUser = {...currentUser, profile: updatedProfile};
            setCurrentUser(updatedUser);
            setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
            setModal({show: true, title: "Berhasil", content: <p className="text-center text-green-600">Profil berhasil diperbarui!</p>});
        } catch (error: any) {
             console.error(error);
             setModal({ show: true, title: 'Error', content: <p>{error.message}</p> });
        }
    };
    
    const adminAddUser = async (newUser: User) => {
       try {
            const response = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Gagal menambah user');
            }
            const addedUser = await response.json();
            setUsers(prev => [...prev, addedUser]);
            setModal({ show: true, title: "Sukses", content: <p>User baru <b>{addedUser.profile.nama}</b> berhasil ditambahkan.</p> });
            setCurrentPage('manajemenPelanggan');
       } catch(error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
       }
    };

    const adminAddReward = async (newRewardData: Omit<Reward, 'id'>) => {
        try {
            const response = await fetch(`${API_URL}/rewards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRewardData),
            });
            if (!response.ok) throw new Error('Gagal menambah hadiah');
            const addedReward = await response.json();
            setRewards(prev => [...prev, addedReward]);
            setModal({ show: true, title: "Sukses", content: <p>Hadiah baru berhasil ditambahkan.</p> });
        } catch (error: any) {
            console.error(error);
            setModal({ show: true, title: 'Error', content: <p>{error.message}</p> });
        }
    };

    const adminUpdateReward = async (updatedReward: Reward) => {
        try {
            await fetch(`${API_URL}/rewards/${updatedReward.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedReward),
            });
            setRewards(prev => prev.map(r => r.id === updatedReward.id ? updatedReward : r));
            setModal({ show: true, title: "Sukses", content: <p>Data hadiah berhasil diperbarui.</p> });
        } catch (error) {
            console.error(error);
             setModal({ show: true, title: 'Error', content: <p>Gagal memperbarui hadiah.</p> });
        }
    };

    const adminDeleteReward = async (rewardId: number) => {
       try {
            await fetch(`${API_URL}/rewards/${rewardId}`, { method: 'DELETE' });
            setRewards(prev => prev.filter(r => r.id !== rewardId));
            setModal({ show: true, title: "Sukses", content: <p>Hadiah berhasil dihapus.</p> });
        } catch (error) {
            console.error(error);
            setModal({ show: true, title: 'Error', content: <p>Gagal menghapus hadiah.</p> });
        }
    };

    const adminUpdateLoyaltyProgram = (updatedProgram: LoyaltyProgram) => {
        console.log("Update loyalty program - needs backend endpoint");
    };

    const adminAddTransaction = async (data: Omit<Transaction, 'id' | 'pointsEarned' > & {totalPembelian: number}) => {
        try {
            const response = await fetch(`${API_URL}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
             if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.message || "Gagal menambah transaksi");
             };
            const { pointsEarned } = await response.json();

            // Refetch data for consistency
            await fetchBootstrapData();
            
            const user = users.find(u => u.id === data.userId);
            if(user) {
                setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Transaksi berhasil ditambahkan. Mitra <b className='text-gray-800'>{user.profile.nama}</b> mendapat <b className='text-gray-800'>{pointsEarned}</b> poin.</p> });
            }
        } catch(error: any) {
             setModal({ show: true, title: "Error", content: <p>{error.message}</p>});
        }
    };
    
    const adminBulkAddTransactions = (bulkData: any[]) => {
         console.log("Bulk add transactions - needs backend endpoint");
    };
    
    const adminBulkUpdateProgramProgress = async (programId: number, progressData: { userId: string, progress: number }[]) => {
        try {
            const response = await fetch(`${API_URL}/programs/${programId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(progressData),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Gagal memperbarui progres.');
            }

            const { updatedCount } = await response.json();
            setModal({
                show: true,
                title: "Upload Berhasil",
                content: <p>Berhasil memperbarui progres untuk <b>{updatedCount}</b> mitra.</p>
            });
            await fetchBootstrapData(); // Refetch all data for consistency
        } catch (error: any) {
            console.error('Bulk progress update error:', error);
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    };

    const renderPage = () => {
        if (isLoading) return <div className="h-screen w-screen flex justify-center items-center text-xl font-bold">Memuat Data Aplikasi...</div>;
        if (error) return <div className="h-screen w-screen flex justify-center items-center text-xl text-red-500 p-8 text-center">{error}</div>;

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
        if (isReadOnly && currentPage === 'tambahUser') setCurrentPage('adminDashboard');

        const pageMap: {[key in Page]?: React.ReactNode} = {
            pelangganDashboard: <PelangganDashboard currentUser={currentUser} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={setCurrentPage} raffleWinners={raffleWinners} />,
            historyPembelian: <HistoryPembelian currentUser={currentUser} transactions={transactions} redemptionHistory={redemptionHistory} />,
            pencapaianProgram: <PencapaianProgram currentUser={currentUser} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
            tukarPoin: <TukarPoin currentUser={currentUser} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
            editProfile: <EditProfilePage currentUser={currentUser} updateUserProfile={updateUserProfile} handleLogout={handleLogout} />,
            adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms}/>,
            manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} setCurrentPage={setCurrentPage} isReadOnly={isReadOnly} />,
            tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
            manajemenProgram: <ManajemenProgram programs={runningPrograms} setPrograms={setRunningPrograms} adminBulkUpdateProgramProgress={adminBulkUpdateProgramProgress} isReadOnly={isReadOnly} />,
            manajemenPoin: <ManajemenPoin users={users.filter(u=>u.role==='pelanggan')} setUsers={setUsers} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={adminBulkAddTransactions} isReadOnly={isReadOnly} />,
            manajemenHadiah: <ManajemenHadiah rewards={rewards} addReward={adminAddReward} updateReward={adminUpdateReward} deleteReward={adminDeleteReward} isReadOnly={isReadOnly} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} />,
            // FIX: Corrected a typo where an undefined variable `setPrograms` was passed instead of `setRafflePrograms`.
            manajemenUndian: <ManajemenUndian users={users.filter(u => u.role === 'pelanggan')} programs={rafflePrograms} setPrograms={setRafflePrograms} redemptions={couponRedemptions} isReadOnly={isReadOnly} />
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