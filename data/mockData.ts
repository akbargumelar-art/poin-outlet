import { User, Transaction, Reward, Redemption, LoyaltyProgram, RunningProgram, DigiposData, LocationData, RaffleProgram, CouponRedemption, RaffleWinner } from '../types';

export const MOCK_DIGIPOS_DATA: DigiposData = {
    'DG12345': { namaOutlet: 'Jaya Cell', noRs: 'RS-001' },
    'DG67890': { namaOutlet: 'Berkah Pulsa', noRs: 'RS-002' },
    'DG54321': { namaOutlet: 'Maju Terus Reload', noRs: 'RS-003' },
    'DG11223': { namaOutlet: 'Sinar Pagi', noRs: 'RS-004' },
    'DG44556': { namaOutlet: 'Ceria Cell', noRs: 'RS-005' },
    'DG77889': { namaOutlet: 'Raja Pulsa', noRs: 'RS-006' },
};

// Data Geografis & Salesforce yang Diperbarui
const salesforceNames = [
    'Asep Sunandar', 'Budi Santoso', 'Cecep Firmansyah', 'Dedi Mulyadi', 'Euis Komariah', 'Fajar Sidik',
    'Gunawan Wibisono', 'Hesti Purwadinata', 'Indra Lesmana', 'Jajang Nurjaman', 'Kiki Amelia', 'Lina Marlina',
    'Maman Abdurahman', 'Nina Wang', 'Opick', 'Pipik Dian', 'Qomar', 'Rina Nose', 'Sule', 'Tukul Arwana',
    'Uya Kuya', 'Vicky Prasetyo', 'Wendy Cagur', 'Yadi Sembako', 'Zaskia Gotik', 'Adi Bing Slamet',
    'Bopak Castello', 'Cak Lontong', 'Denny Cagur', 'Eko Patrio', 'Fitri Tropica', 'Gilang Dirga',
    'Hendra Hidayat', 'Ivan Gunawan', 'Joko Anwar', 'Kartika Putri', 'Luna Maya'
];

export const MOCK_LOCATION_DATA: LocationData = {
    'Kota Cirebon': {
        'Harjamukti': [salesforceNames[0], salesforceNames[1]],
        'Kejaksan': [salesforceNames[2], salesforceNames[3]],
        'Kesambi': [salesforceNames[4], salesforceNames[5]],
        'Lemahwungkuk': [salesforceNames[6]],
        'Pekalipan': [salesforceNames[7]],
    },
    'Kabupaten Cirebon': {
        'Palimanan': [salesforceNames[8], salesforceNames[9]],
        'Lemahabang': [salesforceNames[10], salesforceNames[11], salesforceNames[12]],
        'Astanajapura': [salesforceNames[13], salesforceNames[14]],
        'Babakan': [salesforceNames[15]],
        'Ciledug': [salesforceNames[16]],
        'Sumber': [salesforceNames[17], salesforceNames[18]],
        'Plered': [salesforceNames[19]],
    },
    'Kabupaten Kuningan': {
        'Kuningan': [salesforceNames[20], salesforceNames[21], salesforceNames[22]],
        'Luragung': [salesforceNames[23], salesforceNames[24]],
        'Ciawigebang': [salesforceNames[25], salesforceNames[26]],
        'Cilimus': [salesforceNames[27], salesforceNames[28]],
        'Cigugur': [salesforceNames[29]],
        'Darma': [salesforceNames[30]],
        'Jalaksana': [salesforceNames[31]],
        'Cibingbin': [salesforceNames[32]],
        'Garawangi': [salesforceNames[33]],
        'Subang': [salesforceNames[34]],
        'Cibeureum': [salesforceNames[35]],
        'Ciwaru': [salesforceNames[36]],
    }
};

export const initialUsers: User[] = [
    { id: 'admin', password: 'admin', role: 'admin', profile: { nama: 'Admin Utama', email: 'admin@mitra.com', phone: '081234567890', tap: 'CIREBON' }},
    { id: 'spv', password: 'spv', role: 'supervisor', profile: { nama: 'Supervisor', email: 'spv@mitra.com', phone: '081234567891', tap: 'CIREBON' }},
    { id: 'DG10001', password: 'password', role: 'pelanggan', points: 12500, kuponUndian: 5, level: 'Gold', profile: { nama: 'Jaya Cell', owner: 'Budi Gunawan', email: 'jayacell@example.com', phone: '081298765432', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Palimanan', salesforce: 'Indra Lesmana', noRs: 'RS-001', alamat: 'Jl. Merdeka No. 10', tap: 'Palimanan' }},
    { id: 'DG10002', password: 'password', role: 'pelanggan', points: 4500, kuponUndian: 1, level: 'Silver', profile: { nama: 'Berkah Pulsa', owner: 'Siti Aminah', email: 'berkahpulsa@example.com', phone: '085611223344', kabupaten: 'Kabupaten Kuningan', kecamatan: 'Kuningan', salesforce: 'Kiki Amelia', noRs: 'RS-002', alamat: 'Jl. Raya Cilimus No. 25', tap: 'Kuningan' }},
    { id: 'DG10003', password: 'password', role: 'pelanggan', points: 1500, kuponUndian: 0, level: 'Bronze', profile: { nama: 'Sinar Pagi', owner: 'Ahmad', email: 'sinarpagi@example.com', phone: '081111111111', kabupaten: 'Kota Cirebon', kecamatan: 'Kesambi', salesforce: 'Euis Komariah', noRs: 'RS-004', alamat: 'Jl. Ciledug No. 1', tap: 'Pemuda' }},
    { id: 'DG10004', password: 'password', role: 'pelanggan', points: 15000, kuponUndian: 8, level: 'Gold', profile: { nama: 'Ceria Cell', owner: 'Rina', email: 'ceriacell@example.com', phone: '082222222222', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Plered', salesforce: 'Sule', noRs: 'RS-005', alamat: 'Jl. Plered No. 5', tap: 'Palimanan' }},
    { id: 'DG10005', password: 'password', role: 'pelanggan', points: 30000, kuponUndian: 12, level: 'Platinum', profile: { nama: 'Raja Pulsa', owner: 'David', email: 'rajapulsa@example.com', phone: '083333333333', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Lemahabang', salesforce: 'Maman Abdurahman', noRs: 'RS-006', alamat: 'Jl. Ciawi No. 10', tap: 'Lemahabang' }},
    { id: 'DG10006', password: 'password', role: 'pelanggan', points: 8000, kuponUndian: 3, level: 'Silver', profile: { nama: 'Luragung Cell', owner: 'Lurah', email: 'luragung@example.com', phone: '084444444444', kabupaten: 'Kabupaten Kuningan', kecamatan: 'Luragung', salesforce: 'Rina Nose', noRs: 'RS-007', alamat: 'Jl. Luragung No. 1', tap: 'Luragung' }},
    { id: 'DG10007', password: 'password', role: 'pelanggan', points: 2200, kuponUndian: 0, level: 'Bronze', profile: { nama: 'Pemuda Reload', owner: 'Joko', email: 'pemuda@example.com', phone: '085555555555', kabupaten: 'Kota Cirebon', kecamatan: 'Harjamukti', salesforce: 'Asep Sunandar', noRs: 'RS-008', alamat: 'Jl. Pemuda No. 20', tap: 'Pemuda' }},
    { id: 'DG10008', password: 'password', role: 'pelanggan', points: 18000, kuponUndian: 10, level: 'Gold', profile: { nama: 'Kuningan Jaya', owner: 'Jaya', email: 'kuningan@example.com', phone: '086666666666', kabupaten: 'Kabupaten Kuningan', kecamatan: 'Cilimus', salesforce: 'Ivan Gunawan', noRs: 'RS-009', alamat: 'Jl. Cilimus No. 30', tap: 'Kuningan' }},
    { id: 'DG10009', password: 'password', role: 'pelanggan', points: 40000, kuponUndian: 25, level: 'Platinum', profile: { nama: 'Lemahabang Perkasa', owner: 'Perkasa', email: 'lemah@example.com', phone: '087777777777', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Lemahabang', salesforce: 'Nina Wang', noRs: 'RS-010', alamat: 'Jl. Lemahabang No. 5', tap: 'Lemahabang' }},
    { id: 'DG10010', password: 'password', role: 'pelanggan', points: 500, kuponUndian: 1, level: 'Bronze', profile: { nama: 'Palimanan Baru', owner: 'Baru', email: 'palimanan@example.com', phone: '088888888888', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Palimanan', salesforce: 'Indra Lesmana', noRs: 'RS-011', alamat: 'Jl. Palimanan No. 15', tap: 'Palimanan' }},
    { id: 'DG10011', password: 'password', role: 'pelanggan', points: 9500, kuponUndian: 4, level: 'Silver', profile: { nama: 'Sumber Rejeki', owner: 'Rejeki', email: 'sumber@example.com', phone: '089999999999', kabupaten: 'Kabupaten Cirebon', kecamatan: 'Sumber', salesforce: 'Qomar', noRs: 'RS-012', alamat: 'Jl. Sumber No. 1', tap: 'Lemahabang' }},
    { id: 'DG10012', password: 'password', role: 'pelanggan', points: 11000, kuponUndian: 2, level: 'Gold', profile: { nama: 'Ciawi Cell', owner: 'Ciawi', email: 'ciawi@example.com', phone: '08123123123', kabupaten: 'Kabupaten Kuningan', kecamatan: 'Ciawigebang', salesforce: 'Tukul Arwana', noRs: 'RS-013', alamat: 'Jl. Ciawigebang No. 8', tap: 'Luragung' }},
    { id: 'DG10013', password: 'password', role: 'pelanggan', points: 100, kuponUndian: 0, level: 'Bronze', profile: { nama: 'Kejaksan Star', owner: 'Star', email: 'kejaksan@example.com', phone: '08124124124', kabupaten: 'Kota Cirebon', kecamatan: 'Kejaksan', salesforce: 'Cecep Firmansyah', noRs: 'RS-014', alamat: 'Jl. Kejaksan No. 9', tap: 'Pemuda' }},
];

export const initialTransactions: Transaction[] = [
    { id: 1, userId: 'DG10001', date: '2025-09-15', produk: 'Pulsa 100K', harga: 98000, kuantiti: 5, totalPembelian: 490000, points: 735 },
    { id: 2, userId: 'DG10001', date: '2025-09-12', produk: 'Paket Data 50GB', harga: 120000, kuantiti: 10, totalPembelian: 1200000, points: 1800 },
    { id: 3, userId: 'DG10002', date: '2025-09-10', produk: 'Voucher Game', harga: 50000, kuantiti: 6, totalPembelian: 300000, points: 360 },
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
    { id: 1, userId: 'DG10001', rewardName: 'Voucher Pulsa 50K', pointsSpent: 5000, date: '2025-09-01' },
];

export const initialRafflePrograms: RaffleProgram[] = [
    { id: 1, name: 'Undian Grand Prize Motor', prize: '1 Unit Sepeda Motor', period: '1 Sep 2025 - 30 Nov 2025', isActive: true },
    { id: 2, name: 'Undian Liburan Ke Bali', prize: 'Paket Liburan 2 Orang', period: '1 Jun 2025 - 31 Agu 2025', isActive: false },
];

export const initialCouponRedemptions: CouponRedemption[] = [
    // Data dummy untuk program undian aktif (id: 1)
    ...Array(5).fill(0).map((_, i) => ({ id: i + 1, userId: 'DG10001', raffleProgramId: 1, redeemedAt: '2025-09-01T10:00:00Z' })),
    { id: 6, userId: 'DG10002', raffleProgramId: 1, redeemedAt: '2025-09-02T11:00:00Z' },
    ...Array(8).fill(0).map((_, i) => ({ id: i + 7, userId: 'DG10004', raffleProgramId: 1, redeemedAt: '2025-09-03T12:00:00Z' })),
    ...Array(12).fill(0).map((_, i) => ({ id: i + 15, userId: 'DG10005', raffleProgramId: 1, redeemedAt: '2025-09-04T13:00:00Z' })),
    ...Array(3).fill(0).map((_, i) => ({ id: i + 27, userId: 'DG10006', raffleProgramId: 1, redeemedAt: '2025-09-05T14:00:00Z' })),
    ...Array(10).fill(0).map((_, i) => ({ id: i + 30, userId: 'DG10008', raffleProgramId: 1, redeemedAt: '2025-09-06T15:00:00Z' })),
    ...Array(25).fill(0).map((_, i) => ({ id: i + 40, userId: 'DG10009', raffleProgramId: 1, redeemedAt: '2025-09-07T16:00:00Z' })),
    { id: 65, userId: 'DG10010', raffleProgramId: 1, redeemedAt: '2025-09-08T17:00:00Z' },
];

export const initialRaffleWinners: RaffleWinner[] = [
    { id: 1, name: 'Berkah Pulsa', prize: 'Paket Liburan 2 Orang', photo: 'https://placehold.co/400x400/663399/FFFFFF?text=BP', period: 'Jun - Agu 2025' },
    { id: 2, name: 'Ceria Cell', prize: 'Paket Liburan 2 Orang', photo: 'https://placehold.co/400x400/20B2AA/FFFFFF?text=CC', period: 'Jun - Agu 2025' },
    { id: 3, name: 'Sinar Pagi', prize: 'Paket Liburan 2 Orang', photo: 'https://placehold.co/400x400/FF7F50/FFFFFF?text=SP', period: 'Jun - Agu 2025' },
];


export const initialLoyaltyPrograms: LoyaltyProgram[] = [
    { level: 'Bronze', pointsNeeded: 0, benefit: 'Poin standar 1x', multiplier: 1 },
    { level: 'Silver', pointsNeeded: 3000, benefit: 'Poin bonus 1.2x', multiplier: 1.2 },
    { level: 'Gold', pointsNeeded: 10000, benefit: 'Poin bonus 1.5x & merchandise', multiplier: 1.5 },
    { level: 'Platinum', pointsNeeded: 25000, benefit: 'Poin bonus 2x & prioritas layanan', multiplier: 2 },
];

export const initialRunningPrograms: RunningProgram[] = [
    { 
        id: 1, 
        name: 'Program Poin Extra', 
        mechanism: 'Akumulasi penjualan tertinggi selama bulan September.', 
        prize: '1 Unit Sepeda Motor', 
        period: '1 Sep - 30 Sep 2025', 
        targets: [{ userId: 'DG10001', progress: 75 }, { userId: 'DG10002', progress: 50 }] 
    },
    { 
        id: 2, 
        name: 'Oktober Ceria', 
        mechanism: 'Raih transaksi terbanyak selama bulan Oktober untuk memenangkan hadiah.', 
        prize: 'Smartphone Terbaru', 
        period: '1 Okt - 31 Okt 2025', 
        targets: [{ userId: 'DG10001', progress: 40 }, { userId: 'DG10002', progress: 65 }] 
    },
    { 
        id: 3, 
        name: 'Poin Double November', 
        mechanism: 'Dapatkan poin ganda untuk setiap transaksi di bulan November.', 
        prize: 'Bonus Poin 2X Lipat', 
        period: '1 Nov - 30 Nov 2025', 
        targets: [{ userId: 'DG10001', progress: 90 }, { userId: 'DG10002', progress: 80 }] 
    },
    { 
        id: 4, 
        name: 'Pesta Akhir Tahun', 
        mechanism: 'Kumpulkan poin sebanyak-banyaknya hingga akhir tahun.', 
        prize: 'Liburan ke Bali', 
        period: '1 Des - 31 Des 2025', 
        targets: [{ userId: 'DG10001', progress: 25 }, { userId: 'DG10002', progress: 30 }] 
    },
];