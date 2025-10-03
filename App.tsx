
import React, { useState, useEffect } from 'react';
import { Page, User, UserProfile, Reward, Redemption, LoyaltyProgram, Transaction, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, Location, PrizeCategory } from './types';

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


    const fetchBootstrapData = async () => {
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
        } catch (error) {
            console.error("Bootstrap failed:", error);
            setModal({ show: true, title: "Error", content: <p>Gagal memuat data dari server. Silakan coba lagi nanti.</p> });
        } finally {
            setIsLoading(false);
        }
    };

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
    }, []);
    
    // --- API HANDLERS ---
    const handleLogin = async (id: string, password: string): Promise<boolean> => {
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
    };
    
    const handleRegister = async (formData: any): Promise<boolean> => {
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
    };
    
    const updateUserProfile = async (profile: UserProfile, photoFile: File | null) => {
        if (!currentUser) return;
        try {
            // 1. Update text data first and get the updated user object from server
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
    
            // 2. Upload photo if it exists
            if (photoFile) {
                const formData = new FormData();
                formData.append('profilePhoto', photoFile);
                const photoResponse = await fetch(`/api/users/${currentUser.id}/photo`, {
                    method: 'POST',
                    body: formData,
                });
                if (!photoResponse.ok) throw new Error('Gagal mengunggah foto.');
                const photoData = await photoResponse.json();
                // Merge the new photo URL into the user object
                updatedUserFromServer.profile.photoUrl = photoData.photoUrl;
            }
            
            // 3. Update state with the final, canonical user object from the server
            setCurrentUser(updatedUserFromServer);
            localStorage.setItem('currentUser', JSON.stringify(updatedUserFromServer));
            setUsers(users.map(u => u.id === currentUser.id ? updatedUserFromServer : u));
    
            setModal({ show: true, title: "Berhasil", content: <p className="text-center text-green-600">Profil berhasil diperbarui!</p> });
        } catch (error: any) {
             setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUser');
        setCurrentPage('landing');
    };
    
    const redeemReward = async (reward: Reward) => {
        if (!currentUser) return;
        try {
            const isKupon = reward.name.includes('Kupon Undian');
            const response = await fetch('/api/redemptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, rewardId: reward.id, pointsSpent: reward.points, isKupon })
            });

            if(!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Gagal melakukan penukaran");
            }

            // Optimistic UI update and then full refresh
            const updatedUser: User = { 
                ...currentUser, 
                points: (currentUser.points || 0) - reward.points,
                kuponUndian: isKupon ? (currentUser.kuponUndian || 0) + 1 : currentUser.kuponUndian,
            };
            setCurrentUser(updatedUser);
            
            await fetchBootstrapData(); // Full refresh to ensure consistency

            setModal({ show: true, title: 'Sukses!', content: <p className="text-center text-green-600">Penukaran <b>{reward.name}</b> berhasil.</p> });
        } catch (error: any) {
             setModal({show: true, title: "Gagal", content: <p>{error.message}</p>});
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
    
    const adminAddUser = async (newUser: User) => {
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
    
            // Successfully added, now refresh data to ensure consistency
            await fetchBootstrapData();
            
            setModal({ show: true, title: "Sukses", content: <p>User baru <b>{data.profile.nama}</b> berhasil ditambahkan ke database.</p> });
            setCurrentPage('manajemenPelanggan');
    
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    };

    const adminAddTransaction = async (data: Omit<Transaction, 'id' | 'pointsEarned' > & {totalPembelian: number}) => {
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
    };

    const saveReward = async (rewardData: Omit<Reward, 'id'> & { id?: number }, photoFile: File | null) => {
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
                if (!photoResponse.ok) throw new Error('Data teks disimpan, tapi gagal mengunggah foto.');
            }
            
            setModal({ show: true, title: "Sukses", content: <p>Data hadiah berhasil disimpan.</p> });
            await fetchBootstrapData();
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    };

    const saveProgram = async (programData: Omit<RunningProgram, 'id' | 'targets'> & { id?: number; prizeCategory: PrizeCategory; prizeDescription: string; }, photoFile: File | null) => {
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
                if (!photoResponse.ok) throw new Error('Data program disimpan, tapi foto gagal diunggah.');
            }
            
            setModal({ show: true, title: "Sukses", content: <p>Data program berhasil disimpan.</p> });
            await fetchBootstrapData();
        } catch (error: any) {
            setModal({ show: true, title: "Error", content: <p>{error.message}</p> });
        }
    };

    // ... other admin handlers would follow a similar pattern of API calls + fetchBootstrapData()
    // For brevity, only key functions are converted. The rest follow the same logic.
    // The existing mock functions can serve as placeholders until each API endpoint is built.
    const getMockFunctionality = () => {
        return {
            adminDeleteReward: (rewardId: number) => { setRewards(prev => prev.filter(r => r.id !== rewardId)); setModal({ show: true, title: "Sukses (Simulasi)", content: <p>Hadiah dihapus.</p> }); },
            adminUpdateLoyaltyProgram: (updatedProgram: LoyaltyProgram) => { setLoyaltyPrograms(prev => prev.map(p => p.level === updatedProgram.level ? updatedProgram : p)); setModal({ show: true, title: "Sukses (Simulasi)", content: <p>Level <b>{updatedProgram.level}</b> diperbarui.</p> }); },
            adminBulkAddTransactions: (bulkData: any[]) => { setModal({ show: true, title: "Upload Selesai (Simulasi)", content: <p>{bulkData.length-1} dari {bulkData.length} transaksi berhasil.</p> }); },
            adminBulkUpdateProgramProgress: (programId: number, progressData: { userId: string, progress: number }[]) => { setModal({ show: true, title: "Upload Berhasil (Simulasi)", content: <p>Berhasil memperbarui progres.</p> }); },
        }
    }

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
        if (isReadOnly && (currentPage === 'tambahUser' || currentPage === 'manajemenPoin')) {
            setCurrentPage('adminDashboard');
        }


        const pageMap: {[key in Page]?: React.ReactNode} = {
            pelangganDashboard: <PelangganDashboard currentUser={currentUser} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={setCurrentPage} raffleWinners={raffleWinners} />,
            historyPembelian: <HistoryPembelian currentUser={currentUser} transactions={transactions} redemptionHistory={redemptionHistory} />,
            pencapaianProgram: <PencapaianProgram currentUser={currentUser} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
            tukarPoin: <TukarPoin currentUser={currentUser} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} loyaltyPrograms={loyaltyPrograms} />,
            editProfile: <EditProfilePage currentUser={currentUser} updateUserProfile={updateUserProfile} handleLogout={handleLogout} />,
            adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms} loyaltyPrograms={loyaltyPrograms}/>,
            manajemenPelanggan: <ManajemenPelanggan users={users} transactions={transactions} setCurrentPage={setCurrentPage} isReadOnly={isReadOnly} />,
            tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
            manajemenProgram: <ManajemenProgram programs={runningPrograms} onSave={saveProgram} adminBulkUpdateProgramProgress={getMockFunctionality().adminBulkUpdateProgramProgress} isReadOnly={isReadOnly} />,
            manajemenPoin: <ManajemenPoin users={users.filter(u=>u.role==='pelanggan')} setUsers={setUsers} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={getMockFunctionality().adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={getMockFunctionality().adminBulkAddTransactions} isReadOnly={isReadOnly} />,
            manajemenHadiah: <ManajemenHadiah rewards={rewards} onSave={saveReward} deleteReward={getMockFunctionality().adminDeleteReward} isReadOnly={isReadOnly} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={getMockFunctionality().adminUpdateLoyaltyProgram} />,
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