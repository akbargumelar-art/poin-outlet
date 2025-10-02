import { User, Transaction, Reward, Redemption, LoyaltyProgram, RunningProgram, RaffleProgram, CouponRedemption, RaffleWinner, Location } from '../types';

// --- MASTER DATA (Simulates a separate table for validation) ---
export const digiposMasterData = [
    { id_digipos: 'DG99999', no_rs: 'RS001', nama_outlet: 'Konter Jaya Abadi', tap: 'CIREBON', salesforce: 'Budi Santoso', is_registered: false },
    { id_digipos: 'DG88888', no_rs: 'RS002', nama_outlet: 'Berkah Cell', tap: 'KUNINGAN', salesforce: 'Citra Lestari', is_registered: false },
    { id_digipos: 'DG77777', no_rs: 'RS003', nama_outlet: 'Maju Terus Pulsa', tap: 'MAJALENGKA', salesforce: 'Doni Firmansyah', is_registered: false },
    { id_digipos: 'DG12345', no_rs: 'RS004', nama_outlet: 'Mitra Cirebon', tap: 'CIREBON', salesforce: 'Budi Santoso', is_registered: true },
];


// --- USERS ---
export const mockUsers: User[] = [
    // Admin User
    {
        id: 'admin',
        password: 'password', // Plain text for mock
        role: 'admin',
        profile: {
            nama: 'Admin Utama',
            email: 'admin@agrabudi.com',
            phone: '081234567890',
            tap: 'CIREBON',
            jabatan: 'Head Admin',
            photoUrl: 'https://i.pravatar.cc/150?u=admin'
        },
    },
    // Supervisor User
    {
        id: 'supervisor',
        password: 'password',
        role: 'supervisor',
        profile: {
            nama: 'Supervisor Cirebon',
            email: 'spv.cirebon@agrabudi.com',
            phone: '081234567891',
            tap: 'CIREBON',
            jabatan: 'Supervisor Lapangan',
            photoUrl: 'https://i.pravatar.cc/150?u=supervisor'
        },
    },
    // Pelanggan Users
    {
        id: 'DG12345',
        password: 'password',
        role: 'pelanggan',
        points: 12500,
        level: 'Gold',
        kuponUndian: 5,
        profile: {
            nama: 'Mitra Cirebon',
            owner: 'Ahmad Subarjo',
            email: 'mitra.cirebon@example.com',
            phone: '085678901234',
            tap: 'CIREBON',
            kabupaten: 'CIREBON',
            kecamatan: 'KESAMBI',
            salesforce: 'Budi Santoso',
            noRs: 'RS-00123',
            alamat: 'Jl. Cirebon Raya No. 1',
            photoUrl: 'https://i.pravatar.cc/150?u=DG12345'
        },
    },
    {
        id: 'DG67890',
        password: 'password',
        role: 'pelanggan',
        points: 4500,
        level: 'Silver',
        kuponUndian: 2,
        profile: {
            nama: 'Kuningan Cell',
            owner: 'Siti Aminah',
            email: 'kuningan.cell@example.com',
            phone: '087712345678',
            tap: 'KUNINGAN',
            kabupaten: 'KUNINGAN',
            kecamatan: 'CIGUGUR',
            salesforce: 'Citra Lestari',
            noRs: 'RS-00456',
            alamat: 'Jl. Kuningan Indah No. 2',
            photoUrl: 'https://i.pravatar.cc/150?u=DG67890'
        },
    },
    {
        id: 'DG11223',
        password: 'password',
        role: 'pelanggan',
        points: 800,
        level: 'Bronze',
        kuponUndian: 0,
        profile: {
            nama: 'Majalengka Jaya',
            owner: 'Udin Saepudin',
            email: 'majalengka.jaya@example.com',
            phone: '089956781234',
            tap: 'MAJALENGKA',
            kabupaten: 'MAJALENGKA',
            kecamatan: 'JATIWANGI',
            salesforce: 'Doni Firmansyah',
            noRs: 'RS-00789',
            alamat: 'Jl. Majalengka Asri No. 3'
        },
    },
];

// --- TRANSACTIONS ---
export const mockTransactions: Transaction[] = [
    { id: 1, userId: 'DG12345', date: '2024-07-15T10:00:00Z', produk: 'Pulsa 100rb', harga: 98000, kuantiti: 10, totalPembelian: 980000, pointsEarned: 1176 },
    { id: 2, userId: 'DG67890', date: '2024-07-16T11:30:00Z', produk: 'Paket Data 50GB', harga: 120000, kuantiti: 5, totalPembelian: 600000, pointsEarned: 660 },
    { id: 3, userId: 'DG12345', date: '2024-07-20T14:00:00Z', produk: 'Voucher Game', harga: 50000, kuantiti: 20, totalPembelian: 1000000, pointsEarned: 1200 },
    { id: 4, userId: 'DG11223', date: '2024-07-21T09:00:00Z', produk: 'Pulsa 25rb', harga: 25000, kuantiti: 10, totalPembelian: 250000, pointsEarned: 250 },
];

// --- REWARDS ---
export const mockRewards: Reward[] = [
    { id: 1, name: 'Saldo GoPay Rp 50.000', points: 5000, imageUrl: 'https://images.unsplash.com/photo-1611944212129-29955ae2d63f?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', stock: 50 },
    { id: 2, name: 'Voucher Listrik Rp 100.000', points: 10000, imageUrl: 'https://images.unsplash.com/photo-1588456420076-15635b3aa9d3?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', stock: 30 },
    { id: 3, name: 'Minyak Goreng 2L', points: 2500, imageUrl: 'https://images.unsplash.com/photo-1622324170300-410a56c49bdd?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', stock: 100 },
    { id: 4, name: 'Smartphone Entry-Level', points: 100000, imageUrl: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', stock: 5 },
    { id: 5, name: 'Kupon Undian Grand Prize', points: 1000, imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600', stock: 9999 },
];

// --- REDEMPTIONS ---
export const mockRedemptions: Redemption[] = [
    { id: 1, userId: 'DG12345', rewardId: 3, rewardName: 'Minyak Goreng 2L', pointsSpent: 2500, date: '2024-07-18T15:00:00Z' },
    { id: 2, userId: 'DG67890', rewardId: 5, rewardName: 'Kupon Undian Grand Prize', pointsSpent: 1000, date: '2024-07-19T16:00:00Z' },
];

// --- LOYALTY PROGRAMS ---
export const mockLoyaltyPrograms: LoyaltyProgram[] = [
    { level: 'Bronze', pointsNeeded: 0, benefit: 'Pengali Poin 1.0x', multiplier: 1.0 },
    { level: 'Silver', pointsNeeded: 4000, benefit: 'Pengali Poin 1.1x', multiplier: 1.1 },
    { level: 'Gold', pointsNeeded: 10000, benefit: 'Pengali Poin 1.2x', multiplier: 1.2 },
    { level: 'Platinum', pointsNeeded: 25000, benefit: 'Pengali Poin 1.5x', multiplier: 1.5 },
];

// --- RUNNING PROGRAMS ---
export const mockRunningPrograms: RunningProgram[] = [
    {
        id: 1,
        name: 'Program Penjualan Orbit',
        mechanism: 'Capai penjualan 50 unit modem Orbit untuk mendapatkan hadiah.',
        prize: 'Smart TV 43"',
        startDate: '2024-07-01T00:00:00Z',
        endDate: '2024-09-30T23:59:59Z',
        imageUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        targets: [
            { id: 1, programId: 1, userId: 'DG12345', progress: 75 },
            { id: 2, programId: 1, userId: 'DG67890', progress: 40 },
        ]
    },
    {
        id: 2,
        name: 'Aktivasi Perdana Terbanyak',
        mechanism: 'Jadilah 3 outlet dengan aktivasi kartu perdana terbanyak.',
        prize: 'Uang Tunai Rp 2.000.000',
        startDate: '2024-08-01T00:00:00Z',
        endDate: '2024-08-31T23:59:59Z',
        imageUrl: 'https://images.unsplash.com/photo-1611853384555-590021c107e3?ixlib=rb-4.0.3&q=85&fm=jpg&crop=entropy&cs=srgb&w=600',
        targets: [
            { id: 3, programId: 2, userId: 'DG12345', progress: 90 },
            { id: 4, programId: 2, userId: 'DG67890', progress: 85 },
            { id: 5, programId: 2, userId: 'DG11223', progress: 60 },
        ]
    }
];

// --- RAFFLE PROGRAMS ---
export const mockRafflePrograms: RaffleProgram[] = [
    { id: 1, name: 'Undian Tengah Tahun', prize: 'Motor Listrik', period: '1 Mei - 31 Jul 2024', isActive: true },
    { id: 2, name: 'Undian Akhir Tahun', prize: 'Paket Umroh', period: '1 Sep - 30 Nov 2024', isActive: false },
];

// --- COUPON REDEMPTIONS ---
export const mockCouponRedemptions: CouponRedemption[] = [
    { id: 1, userId: 'DG12345', raffleProgramId: 1, redeemedAt: '2024-07-05T10:00:00Z' },
    { id: 2, userId: 'DG12345', raffleProgramId: 1, redeemedAt: '2024-07-10T11:00:00Z' },
    { id: 3, userId: 'DG67890', raffleProgramId: 1, redeemedAt: '2024-07-12T12:00:00Z' },
];

// --- RAFFLE WINNERS ---
export const mockRaffleWinners: RaffleWinner[] = [
    { id: 1, name: 'Juara Cell', prize: 'Sepeda Gunung', photoUrl: 'https://i.pravatar.cc/150?u=winner1', period: 'Jan - Mar 2024' },
    { id: 2, name: 'Berkah Bersama', prize: 'Kulkas 2 Pintu', photoUrl: 'https://i.pravatar.cc/150?u=winner2', period: 'Jan - Mar 2024' },
];

// --- LOCATIONS ---
export const mockLocations: Location[] = [
    { id: 1, kabupaten: 'CIREBON', kecamatan: 'KESAMBI' },
    { id: 2, kabupaten: 'CIREBON', kecamatan: 'HARJAMUKTI' },
    { id: 3, kabupaten: 'KUNINGAN', kecamatan: 'CIGUGUR' },
    { id: 4, kabupaten: 'KUNINGAN', kecamatan: 'CILIMUS' },
    { id: 5, kabupaten: 'MAJALENGKA', kecamatan: 'JATIWANGI' },
    { id: 6, kabupaten: 'MAJALENGKA', kecamatan: 'LEMAHSUGIH' },
    { id: 7, kabupaten: 'INDRAMAYU', kecamatan: 'HAURGEULIS' },
    { id: 8, kabupaten: 'INDRAMAYU', kecamatan: 'JATIBARANG' },
];
