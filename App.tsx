
import React, { useState } from 'react';
import { Page, User, UserProfile, Reward, Redemption } from './types';
import { initialUsers, initialTransactions, initialRewards, initialRedemptionHistory, initialLoyaltyPrograms, initialRunningPrograms, MOCK_DIGIPOS_DATA, MOCK_LOCATION_DATA } from './data/mockData';

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

function App() {
    const [currentPage, setCurrentPage] = useState<Page>('landing');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [modal, setModal] = useState({ show: false, content: <></>, title: '' });
    
    const [users, setUsers] = useState(initialUsers);
    const [transactions, setTransactions] = useState(initialTransactions);
    const [rewards, setRewards] = useState(initialRewards);
    const [redemptionHistory, setRedemptionHistory] = useState(initialRedemptionHistory);
    const [loyaltyPrograms] = useState(initialLoyaltyPrograms);
    const [runningPrograms, setRunningPrograms] = useState(initialRunningPrograms);

    const handleLogin = (id: string, password: string): boolean => {
        const user = users.find(u => u.id === id && u.password === password);
        if (user) {
            setCurrentUser(user);
            setCurrentPage(user.role === 'admin' ? 'adminDashboard' : 'pelangganDashboard');
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
        
        if (!isKupon) {
            const updatedRewards = rewards.map(r => r.id === reward.id ? {...r, stock: r.stock -1 } : r);
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
    
    const adminDeleteUser = (userId: string) => setUsers(users.filter(u => u.id !== userId));

    const renderPage = () => {
        if (!currentUser) {
            switch (currentPage) {
                case 'login':
                    return <LoginPage handleLogin={handleLogin} setCurrentPage={setCurrentPage} />;
                case 'register':
                    return <RegisterPage handleRegister={handleRegister} setCurrentPage={setCurrentPage} users={users} MOCK_LOCATION_DATA={MOCK_LOCATION_DATA} MOCK_DIGIPOS_DATA={MOCK_DIGIPOS_DATA} />;
                case 'landing':
                default:
                    return <LandingPage setCurrentPage={setCurrentPage} rewards={rewards} runningPrograms={runningPrograms} />;
            }
        }
        
        const pageMap: {[key in Page]?: React.ReactNode} = {
            pelangganDashboard: <PelangganDashboard currentUser={currentUser} transactions={transactions} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} setCurrentPage={setCurrentPage} />,
            historyPembelian: <HistoryPembelian currentUser={currentUser} transactions={transactions} redemptionHistory={redemptionHistory} />,
            pencapaianProgram: <PencapaianProgram currentUser={currentUser} loyaltyPrograms={loyaltyPrograms} runningPrograms={runningPrograms} />,
            tukarPoin: <TukarPoin currentUser={currentUser} rewards={rewards} handleTukarClick={handleTukarClick} />,
            editProfile: <EditProfilePage currentUser={currentUser} updateUserProfile={updateUserProfile} handleLogout={handleLogout} />,
            adminDashboard: <AdminDashboard users={users} transactions={transactions} runningPrograms={runningPrograms}/>,
            manajemenPelanggan: <ManajemenPelanggan users={users} runningPrograms={runningPrograms} adminDeleteUser={adminDeleteUser} />,
            tambahUser: <TambahUserPage adminAddUser={adminAddUser} />,
            manajemenProgram: <ManajemenProgram programs={runningPrograms} setPrograms={setRunningPrograms} />,
            manajemenPoin: <ManajemenPoin users={users.filter(u=>u.role==='pelanggan')} setUsers={setUsers}/>
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