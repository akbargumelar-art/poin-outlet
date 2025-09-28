import { User, Transaction, Reward, Redemption, LoyaltyProgram, RunningProgram, DigiposData, LocationData } from '../types';

export const MOCK_DIGIPOS_DATA: DigiposData = {
    'DG12345': { namaOutlet: 'Jaya Cell', noRs: 'RS-001' },
    'DG67890': { namaOutlet: 'Berkah Pulsa', noRs: 'RS-002' },
    'DG54321': { namaOutlet: 'Maju Terus Reload', noRs: 'RS-003' },
};

export const MOCK_LOCATION_DATA: LocationData = {
    'Kabupaten Cirebon': {
        'Ciledug': ['Asep Sunandar', 'Budi Santoso'],
        'Plered': ['Cecep Firmansyah', 'Dedi Mulyadi'],
        'Sumber': ['Euis Komariah', 'Fajar Sidik'],
    },
    'Kota Cirebon': {
        'Harjamukti': ['Gunawan Wibisono', 'Hesti Purwadinata'],
        'Kejaksan': ['Indra Lesmana', 'Jajang Nurjaman'],
    },
    'Kuningan': {
        'Ciawigebang': ['Kiki Amelia', 'Lina Marlina'],
        'Cilimus': ['Maman Abdurahman', 'Nina Wang'],
    }
};

export const initialUsers: User[] = [
    { id: 'admin', password: 'admin', role: 'admin', profile: { nama: 'Admin Utama', email: 'admin@mitra.com', phone: '081234567890', tap: 'CIREBON' }},
    { id: 'DG12345', password: 'password', role: 'pelanggan', points: 12500, kuponUndian: 5, level: 'Gold', profile: { nama: 'Jaya Cell', owner: 'Budi Gunawan', email: 'jayacell@example.com', phone: '081298765432', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Plered', salesforce: 'Cecep Firmansyah', noRs: 'RS-001', alamat: 'Jl. Merdeka No. 10, Plered, Cirebon' }},
    { id: 'DG67890', password: 'password', role: 'pelanggan', points: 4500, kuponUndian: 1, level: 'Silver', profile: { nama: 'Berkah Pulsa', owner: 'Siti Aminah', email: 'berkahpulsa@example.com', phone: '085611223344', kabupaten: 'Kuningan', kecamatan: 'Cilimus', salesforce: 'Maman Abdurahman', noRs: 'RS-002', alamat: 'Jl. Raya Cilimus No. 25, Kuningan' }}
];

export const initialTransactions: Transaction[] = [
    { id: 1, userId: 'DG12345', date: '2024-07-25', amount: 500000, points: 500 },
    { id: 2, userId: 'DG12345', date: '2024-07-24', amount: 1200000, points: 1200 },
    { id: 3, userId: 'DG67890', date: '2024-07-23', amount: 300000, points: 300 },
];

export const initialRewards: Reward[] = [
    { id: 8, name: '1 Kupon Undian', points: 500, image: 'https://placehold.co/400x300/8E44AD/FFFFFF?text=Kupon+Undian', stock: 999 },
    { id: 1, name: 'Voucher Pulsa 50K', points: 5000, image: 'https://placehold.co/400x300/FF5722/FFFFFF?text=Voucher+Pulsa', stock: 15 },
    { id: 2, name: 'T-Shirt Exclusive', points: 7500, image: 'https://placehold.co/400x300/4CAF50/FFFFFF?text=T-Shirt', stock: 5 },
    { id: 3, name: 'Smartwatch Keren', points: 25000, image: 'https://placehold.co/400x300/03A9F4/FFFFFF?text=Smartwatch', stock: 3 },
    { id: 4, name: 'Power Bank 10000mAh', points: 15000, image: 'https://placehold.co/400x300/673AB7/FFFFFF?text=Power+Bank', stock: 0 },
    { id: 5, name: 'Headphone Bluetooth', points: 20000, image: 'https://placehold.co/400x300/009688/FFFFFF?text=Headphone', stock: 8 },
    { id: 6, name: 'Voucher Belanja 100K', points: 10000, image: 'https://placehold.co/400x300/FFC107/FFFFFF?text=Voucher+100K', stock: 20 },
    { id: 7, name: 'Smartphone Keren', points: 75000, image: 'https://placehold.co/400x300/F44336/FFFFFF?text=Smartphone', stock: 0 },
];


export const initialRedemptionHistory: Redemption[] = [
    { id: 1, userId: 'DG12345', rewardName: 'Voucher Pulsa 50K', pointsSpent: 5000, date: '2024-06-01' },
];

export const initialLoyaltyPrograms: LoyaltyProgram[] = [
    { level: 'Bronze', pointsNeeded: 0, benefit: 'Poin standar 1x' },
    { level: 'Silver', pointsNeeded: 3000, benefit: 'Poin bonus 1.2x' },
    { level: 'Gold', pointsNeeded: 10000, benefit: 'Poin bonus 1.5x & merchandise' },
    { level: 'Platinum', pointsNeeded: 25000, benefit: 'Poin bonus 2x & prioritas layanan' },
];

export const initialRunningPrograms: RunningProgram[] = [
    { 
        id: 1, 
        name: 'Gebyar Kemerdekaan', 
        mechanism: 'Akumulasi penjualan tertinggi selama bulan Agustus.', 
        prize: '1 Unit Sepeda Motor', 
        period: '1 Agu - 31 Agu 2024', 
        targets: [{ userId: 'DG12345', progress: 75 }, { userId: 'DG67890', progress: 50 }] 
    },
    { 
        id: 2, 
        name: 'September Ceria', 
        mechanism: 'Raih transaksi terbanyak selama bulan September untuk memenangkan hadiah.', 
        prize: 'Smartphone Terbaru', 
        period: '1 Sep - 30 Sep 2024', 
        targets: [{ userId: 'DG12345', progress: 40 }, { userId: 'DG67890', progress: 65 }] 
    },
    { 
        id: 3, 
        name: 'Poin Double Oktober', 
        mechanism: 'Dapatkan poin ganda untuk setiap transaksi di bulan Oktober.', 
        prize: 'Bonus Poin 2X Lipat', 
        period: '1 Okt - 31 Okt 2024', 
        targets: [{ userId: 'DG12345', progress: 90 }, { userId: 'DG67890', progress: 80 }] 
    },
    { 
        id: 4, 
        name: 'Pesta Akhir Tahun', 
        mechanism: 'Kumpulkan poin sebanyak-banyaknya hingga akhir tahun.', 
        prize: 'Liburan ke Bali', 
        period: '1 Nov - 31 Des 2024', 
        targets: [{ userId: 'DG12345', progress: 25 }, { userId: 'DG67890', progress: 30 }] 
    },
];