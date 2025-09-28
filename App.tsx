import React, { useState } from 'react';
import { Page, User, UserProfile, Reward, Redemption, LoyaltyProgram, Transaction, RunningProgramTarget, RaffleProgram, CouponRedemption, RaffleWinner } from './types';
import { initialUsers, initialTransactions, initialRewards, initialRedemptionHistory, initialLoyaltyPrograms, initialRunningPrograms, MOCK_DIGIPOS_DATA, MOCK_LOCATION_DATA, initialRafflePrograms, initialCouponRedemptions, initialRaffleWinners } from './data/mockData';

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
    
    const [users, setUsers] = useState(initialUsers);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [rewards, setRewards] = useState(initialRewards);
    const [redemptionHistory, setRedemptionHistory] = useState(initialRedemptionHistory);
    const [loyaltyPrograms, setLoyaltyPrograms] = useState(initialLoyaltyPrograms);
    const [runningPrograms, setRunningPrograms] = useState(initialRunningPrograms);
    const [rafflePrograms, setRafflePrograms] = useState(initialRafflePrograms);
    const [couponRedemptions, setCouponRedemptions] = useState(initialCouponRedemptions);
    const [raffleWinners, setRaffleWinners] = useState(initialRaffleWinners);

    const handleLogin = (id: string, password: string): boolean => {
        const user = users.find(u => u.id === id && u.password === password);
        if (user) {
            setCurrentUser(user);
            setCurrentPage(user.role === 'pelanggan' ? 'pelangganDashboard' : 'adminDashboard');
            return true;
        }
        return false;
    };
    
    const handleRegister = (formData: any) => {
        const newUser: User = {
            id: formData.idDigipos, password: 'password', role: 'pelanggan', points: 0, level: 'Bronze', kuponUndian: 0,
            profile: { nama: formData.namaOutlet, owner: formData.namaOwner, email: '', phone: formData.noWhatsapp, kabupaten: formData.kabupaten, kecamatan: formData.kecamatan, salesforce: formData.namaSalesforce, noRs: formData.noRs }
        };
        setUsers([...users, newUser]);
        setCurrentUser(newUser);
        setCurrentPage('pelangganDashboard');
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentPage('landing');
    };
    
    const redeemReward = (reward: Reward) => {
        if (!currentUser || !currentUser.points) return;
        const isKupon = reward.name.includes('Kupon Undian');
        
        const updatedUser: User = { 
            ...currentUser, 
            points: currentUser.points - reward.points,
            kuponUndian: isKupon ? (currentUser.kuponUndian || 0) + 1 : currentUser.kuponUndian,
        };
        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
        
        if (isKupon) {
            const activeProgram = rafflePrograms.find(p => p.isActive);
            if (activeProgram) {
                const newRedemption: CouponRedemption = {
                    id: couponRedemptions.length + 1,
                    userId: currentUser.id,
                    raffleProgramId: activeProgram.id,
                    redeemedAt: new Date().toISOString(),
                };
                setCouponRedemptions(prev => [...prev, newRedemption]);
            }
        } else {
            const updatedRewards = rewards.map(r => r.id === reward.id ? {...r, stock: r.stock - 1 } : r);
            setRewards(updatedRewards);
        }

        const newHistory: Redemption = { id: redemptionHistory.length + 1, userId: currentUser.id, rewardName: reward.name, pointsSpent: reward.points, date: new Date().toISOString().split('T')[0] };
        setRedemptionHistory([...redemptionHistory, newHistory]);
        setModal({ show: true, title: 'Sukses!', content: <p className="text-center text-green-600">Penukaran <b>{reward.name}</b> berhasil.</p> });
    };
    
    const handleTukarClick = (reward: Reward) => {
        if (!currentUser || !currentUser.points) return;
        if (reward.stock === 0) return;
        if (currentUser.points < reward.points) {
            setModal({show: true, title: "Poin Tidak Cukup", content: <p>Maaf, poin Anda tidak cukup.</p>})
            return;
        }
        setModal({show: true, title: "Konfirmasi", content: <div><p className="text-center mb-4">Tukar {reward.points.toLocaleString('id-ID')} poin untuk {reward.name}?</p><div className="flex justify-center gap-4"><button onClick={() => setModal({show: false, title:'', content:<></>})} className="neu-button">Batal</button><button onClick={() => redeemReward(reward)} className="neu-button text-red-600">Ya</button></div></div>});
    };
    
    const updateUserProfile = (updatedProfile: UserProfile) => {
        if(!currentUser) return;
        const updatedUser = {...currentUser, profile: updatedProfile};
        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
        setModal({show: true, title: "Berhasil", content: <p className="text-center text-green-600">Profil berhasil diperbarui!</p>});
    };
    
    const adminAddUser = (newUser: User) => {
        setUsers([...users, newUser]);
        setModal({show: true, title: "Sukses", content: <p className="text-center text-green-600">User baru berhasil ditambahkan.</p>});
    };

    const adminAddReward = (newReward: Reward) => {
        setRewards(prev => [...prev, newReward]);
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Hadiah baru berhasil ditambahkan.</p> });
    };

    const adminUpdateReward = (updatedReward: Reward) => {
        setRewards(prev => prev.map(r => r.id === updatedReward.id ? updatedReward : r));
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Data hadiah berhasil diperbarui.</p> });
    };

    const adminDeleteReward = (rewardId: number) => {
        setRewards(prev => prev.filter(r => r.id !== rewardId));
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Hadiah berhasil dihapus.</p> });
    };

    const adminUpdateLoyaltyProgram = (updatedProgram: LoyaltyProgram) => {
        setLoyaltyPrograms(prev => prev.map(p => p.level === updatedProgram.level ? updatedProgram : p));
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Aturan level berhasil diperbarui.</p> });
    };

    const adminAddTransaction = (data: Omit<Transaction, 'id' | 'points' >) => {
        const user = users.find(u => u.id === data.userId);
        if (!user) {
            setModal({ show: true, title: "Error", content: <p>User dengan ID {data.userId} tidak ditemukan.</p>});
            return;
        }
        const loyaltyLevel = loyaltyPrograms.find(p => p.level === user.level);
        const multiplier = loyaltyLevel ? loyaltyLevel.multiplier : 1;
        const pointsGained = Math.floor((data.totalPembelian / 1000) * multiplier);

        const newTransaction: Transaction = { ...data, id: Date.now(), points: pointsGained };
        const updatedUser: User = { ...user, points: (user.points || 0) + pointsGained };

        setTransactions(prev => [...prev, newTransaction]);
        setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Transaksi berhasil ditambahkan. Mitra <b className='text-gray-800'>{user.profile.nama}</b> mendapat <b className='text-gray-800'>{pointsGained}</b> poin.</p> });
    };
    
    const adminBulkAddTransactions = (bulkData: Omit<Transaction, 'id' | 'points' | 'totalPembelian'>[]) => {
        const newTransactions: Transaction[] = [];
        const userPointUpdates: { [userId: string]: number } = {};
        let processedCount = 0;

        bulkData.forEach((data, index) => {
            const user = users.find(u => u.id === data.userId);
            if (!user) return; // Skip if user not found

            const totalPembelian = data.harga * data.kuantiti;
            const loyaltyLevel = loyaltyPrograms.find(p => p.level === user.level);
            const multiplier = loyaltyLevel ? loyaltyLevel.multiplier : 1;
            const pointsGained = Math.floor((totalPembelian / 1000) * multiplier);
            
            newTransactions.push({ ...data, totalPembelian, id: Date.now() + index, points: pointsGained });
            userPointUpdates[data.userId] = (userPointUpdates[data.userId] || 0) + pointsGained;
            processedCount++;
        });

        if(processedCount === 0) {
            setModal({ show: true, title: "Gagal", content: <p>Tidak ada data valid yang dapat diproses.</p> });
            return;
        }

        setTransactions(prev => [...prev, ...newTransactions]);
        setUsers(prev => prev.map(u => {
            if (userPointUpdates[u.id]) {
                return { ...u, points: (u.points || 0) + userPointUpdates[u.id] };
            }
            return u;
        }));
        
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600"><b>{processedCount}</b> dari <b>{bulkData.length}</b> transaksi berhasil di-upload dan diproses.</p> });
    };
    
    const adminBulkUpdateProgramProgress = (programId: number, progressData: { userId: string, progress: number }[]) => {
        setRunningPrograms(prevPrograms => prevPrograms.map(program => {
            if (program.id === programId) {
                const progressMap = new Map(progressData.map(item => [item.userId, item.progress]));
                const updatedTargets = program.targets.map(target => ({
                    ...target,
                    progress: progressMap.has(target.userId) ? Math.max(0, Math.min(100, progressMap.get(target.userId)!)) : target.progress
                }));
                return { ...program, targets: updatedTargets };
            }
            return program;
        }));
        setModal({ show: true, title: "Sukses", content: <p className="text-center text-green-600">Progres peserta berhasil diperbarui dari simulasi upload.</p> });
    };

    const renderPage = () => {
        if (!currentUser) {
            switch (currentPage) {
                case 'login':
                    return <LoginPage handleLogin={handleLogin} setCurrentPage={setCurrentPage} />;
                case 'register':
                    return <RegisterPage handleRegister={handleRegister} setCurrentPage={setCurrentPage} users={users} MOCK_LOCATION_DATA={MOCK_LOCATION_DATA} MOCK_DIGIPOS_DATA={MOCK_DIGIPOS_DATA} />;
                case 'landing':
                default:
                    return <LandingPage setCurrentPage={setCurrentPage} rewards={rewards} runningPrograms={runningPrograms} raffleWinners={raffleWinners} />;
            }
        }
        
        const isReadOnly = currentUser.role === 'supervisor';

        // Block supervisor from accessing tambahUser page
        if (isReadOnly && currentPage === 'tambahUser') {
             setCurrentPage('adminDashboard'); // or 'manajemenPelanggan'
        }

        const pageMap: {[key in Page]?: React.ReactNode} = {
            pelangganDashboard: <PelangganDashboard currentUser={currentUser} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={setCurrentPage} raffleWinners={raffleWinners} />,
            historyPembelian: <HistoryPembelian currentUser={currentUser} transactions={transactions} redemptionHistory={redemptionHistory} />,
            pencapaianProgram: <PencapaianProgram currentUser={currentUser} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
            tukarPoin: <TukarPoin currentUser={currentUser} rewards={rewards} handleTukarClick={handleTukarClick} rafflePrograms={rafflePrograms} />,
            editProfile: <EditProfilePage currentUser={currentUser} updateUserProfile={updateUserProfile} handleLogout={handleLogout} />,
            adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms}/>,
            manajemenPelanggan: <ManajemenPelanggan users={users} setCurrentPage={setCurrentPage} isReadOnly={isReadOnly} />,
            tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
            manajemenProgram: <ManajemenProgram programs={runningPrograms} setPrograms={setRunningPrograms} adminBulkUpdateProgramProgress={adminBulkUpdateProgramProgress} isReadOnly={isReadOnly} />,
            manajemenPoin: <ManajemenPoin users={users.filter(u=>u.role==='pelanggan')} setUsers={setUsers} loyaltyPrograms={loyaltyPrograms} updateLoyaltyProgram={adminUpdateLoyaltyProgram} adminAddTransaction={adminAddTransaction} adminBulkAddTransactions={adminBulkAddTransactions} isReadOnly={isReadOnly} />,
            manajemenHadiah: <ManajemenHadiah rewards={rewards} addReward={adminAddReward} updateReward={adminUpdateReward} deleteReward={adminDeleteReward} isReadOnly={isReadOnly} />,
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