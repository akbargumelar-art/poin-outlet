
import React, { useState, useEffect } from 'react';
import { Page, User, UserProfile, Reward, Redemption, LoyaltyProgram, Transaction, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, Location } from './types';

import { 
    mockUsers, mockTransactions, mockRewards, mockRedemptions, mockLoyaltyPrograms, 
    mockRunningPrograms, mockRafflePrograms, mockCouponRedemptions, mockRaffleWinners, 
    mockLocations, digiposMasterData 
} from './data/mockData';

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

    // State for all application data, initialized from mock data
    const [users, setUsers] = useState<User[]>(mockUsers);
    const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
    const [rewards, setRewards] = useState<Reward[]>(mockRewards);
    const [redemptionHistory, setRedemptionHistory] = useState<Redemption[]>(mockRedemptions);
    const [loyaltyPrograms, setLoyaltyPrograms] = useState<LoyaltyProgram[]>(mockLoyaltyPrograms);
    const [runningPrograms, setRunningPrograms] = useState<RunningProgram[]>(mockRunningPrograms);
    const [rafflePrograms, setRafflePrograms] = useState<RaffleProgram[]>(mockRafflePrograms);
    const [couponRedemptions, setCouponRedemptions] = useState<CouponRedemption[]>(mockCouponRedemptions);
    const [raffleWinners, setRaffleWinners] = useState<RaffleWinner[]>(mockRaffleWinners);
    const [locations, setLocations] = useState<Location[]>(mockLocations);
    const [localDigiposMasterData, setLocalDigiposMasterData] = useState(digiposMasterData);

    // --- CLIENT-SIDE HANDLERS ---
    const handleLogin = async (id: string, password: string): Promise<boolean> => {
        return new Promise(resolve => {
            setTimeout(() => { // Simulate network delay
                const user = users.find(u => u.id === id && u.password === password);
                if (user) {
                    setCurrentUser(user);
                    setCurrentPage(user.role === 'pelanggan' ? 'pelangganDashboard' : 'adminDashboard');
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 500);
        });
    };
    
    const handleRegister = async (formData: any): Promise<boolean> => {
        return new Promise(resolve => {
            setTimeout(() => { // Simulate network delay
                if (users.some(u => u.id === formData.idDigipos)) {
                    setModal({ show: true, title: 'Registrasi Gagal', content: <p>ID Digipos sudah terdaftar.</p> });
                    resolve(false);
                    return;
                }
                const masterRecord = localDigiposMasterData.find(d => d.id_digipos === formData.idDigipos);
                const newUser: User = {
                    id: formData.idDigipos,
                    password: 'password', // Default password for new users in mock setup
                    role: 'pelanggan',
                    points: 0,
                    level: 'Bronze',
                    kuponUndian: 0,
                    profile: {
                        nama: formData.namaOutlet,
                        email: `${formData.idDigipos.toLowerCase()}@example.com`,
                        phone: formData.noWhatsapp,
                        owner: formData.namaOwner,
                        kabupaten: formData.kabupaten,
                        kecamatan: formData.kecamatan,
                        salesforce: formData.salesforce,
                        noRs: formData.noRs,
                        tap: masterRecord?.tap || 'UNKNOWN',
                    },
                };
                setUsers(prev => [...prev, newUser]);
                setLocalDigiposMasterData(prev => prev.map(d => d.id_digipos === formData.idDigipos ? {...d, is_registered: true} : d));
                setCurrentUser(newUser);
                setCurrentPage('pelangganDashboard');
                setModal({ show: true, title: 'Registrasi Berhasil', content: <p>Selamat datang! Akun Anda telah berhasil dibuat.</p> });
                resolve(true);
            }, 500);
        });
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentPage('landing');
    };
    
    const redeemReward = (reward: Reward) => {
        if (!currentUser) return;
        
        const isKupon = reward.name.includes('Kupon Undian');
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

        const newRedemption: Redemption = {
            id: Date.now(),
            userId: currentUser.id,
            rewardId: reward.id,
            rewardName: reward.name,
            pointsSpent: reward.points,
            date: new Date().toISOString()
        };
        setRedemptionHistory(prev => [...prev, newRedemption]);

        setModal({ show: true, title: 'Sukses!', content: <p className="text-center text-green-600">Penukaran <b>{reward.name}</b> berhasil.</p> });
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
    
    const updateUserProfile = (updatedProfile: UserProfile) => {
        if(!currentUser) return;
        const updatedUser = {...currentUser, profile: updatedProfile};
        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
        setModal({show: true, title: "Berhasil", content: <p className="text-center text-green-600">Profil berhasil diperbarui!</p>});
    };
    
    const adminAddUser = (newUser: User) => {
        if (users.some(u => u.id === newUser.id)) {
             setModal({ show: true, title: "Error", content: <p>ID/Username <b>{newUser.id}</b> sudah digunakan.</p> });
             return;
        }
        const userToAdd = {...newUser, password: newUser.password || 'password'} // Set default password if not provided
        setUsers(prev => [...prev, userToAdd]);
        setModal({ show: true, title: "Sukses", content: <p>User baru <b>{newUser.profile.nama}</b> berhasil ditambahkan.</p> });
        setCurrentPage('manajemenPelanggan');
    };

    const adminAddReward = (newRewardData: Omit<Reward, 'id'>) => {
        const newReward: Reward = { id: Date.now(), ...newRewardData };
        setRewards(prev => [...prev, newReward]);
        setModal({ show: true, title: "Sukses", content: <p>Hadiah baru berhasil ditambahkan.</p> });
    };

    const adminUpdateReward = (updatedReward: Reward) => {
        setRewards(prev => prev.map(r => r.id === updatedReward.id ? updatedReward : r));
        setModal({ show: true, title: "Sukses", content: <p>Data hadiah berhasil diperbarui.</p> });
    };

    const adminDeleteReward = (rewardId: number) => {
        setRewards(prev => prev.filter(r => r.id !== rewardId));
        setModal({ show: true, title: "Sukses", content: <p>Hadiah berhasil dihapus.</p> });
    };

    const adminUpdateLoyaltyProgram = (updatedProgram: LoyaltyProgram) => {
        setLoyaltyPrograms(prev => prev.map(p => p.level === updatedProgram.level ? updatedProgram : p));
        setModal({ show: true, title: "Sukses", content: <p>Level <b>{updatedProgram.level}</b> berhasil diperbarui.</p> });
    };

    const adminAddTransaction = (data: Omit<Transaction, 'id' | 'pointsEarned' > & {totalPembelian: number}) => {
        const user = users.find(u => u.id === data.userId);
        if (!user) {
            setModal({ show: true, title: "Error", content: <p>User tidak ditemukan.</p>});
            return;
        }
        const loyaltyLevel = loyaltyPrograms.find(p => p.level === user.level);
        const multiplier = loyaltyLevel ? loyaltyLevel.multiplier : 1;
        const pointsEarned = Math.floor((data.totalPembelian / 1000) * multiplier);

        const newTransaction: Transaction = { id: Date.now(), ...data, pointsEarned };
        setTransactions(prev => [...prev, newTransaction]);
        
        setUsers(prevUsers => prevUsers.map(u => u.id === data.userId ? {...u, points: (u.points || 0) + pointsEarned } : u));
        
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Transaksi berhasil ditambahkan. Mitra <b className='text-gray-800'>{user.profile.nama}</b> mendapat <b className='text-gray-800'>{pointsEarned}</b> poin.</p> });
    };
    
    const adminBulkAddTransactions = (bulkData: any[]) => {
        let successCount = 0;
        bulkData.forEach(tx => {
            const user = users.find(u => u.id === tx.userId);
            if(user) {
                 const totalPembelian = tx.harga * tx.kuantiti;
                 adminAddTransaction({...tx, totalPembelian});
                 successCount++;
            }
        });
        setModal({ show: true, title: "Upload Selesai", content: <p>{successCount} dari {bulkData.length} transaksi berhasil diproses.</p> });
    };
    
    const adminBulkUpdateProgramProgress = (programId: number, progressData: { userId: string, progress: number }[]) => {
         let updatedCount = 0;
         setRunningPrograms(prev => prev.map(p => {
             if (p.id === programId) {
                 const newTargets = [...p.targets];
                 progressData.forEach(item => {
                     const targetIndex = newTargets.findIndex(t => t.userId === item.userId);
                     if (targetIndex !== -1) {
                         newTargets[targetIndex] = {...newTargets[targetIndex], progress: item.progress};
                         updatedCount++;
                     }
                 });
                 return {...p, targets: newTargets};
             }
             return p;
         }));
         setModal({
            show: true,
            title: "Upload Berhasil",
            content: <p>Berhasil memperbarui progres untuk <b>{updatedCount}</b> mitra.</p>
        });
    };

    const renderPage = () => {
        if (!currentUser) {
            switch (currentPage) {
                case 'login':
                    return <LoginPage handleLogin={handleLogin} setCurrentPage={setCurrentPage} />;
                case 'register':
                    return <RegisterPage handleRegister={handleRegister} setCurrentPage={setCurrentPage} locations={locations} digiposMasterData={localDigiposMasterData} />;
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
