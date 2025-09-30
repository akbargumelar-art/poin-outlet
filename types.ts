

export type UserRole = 'admin' | 'pelanggan' | 'supervisor';
export type Page = 
    | 'landing'
    | 'login' 
    | 'register' 
    | 'pelangganDashboard' 
    | 'historyPembelian' 
    | 'pencapaianProgram' 
    | 'tukarPoin' 
    | 'editProfile' 
    | 'adminDashboard' 
    | 'manajemenPelanggan' 
    | 'tambahUser'
    | 'manajemenProgram'
    | 'manajemenPoin'
    | 'manajemenHadiah'
    | 'manajemenUndian';

export interface UserProfile {
    nama: string;
    email: string;
    phone: string;
    // Mitra Outlet specific
    owner?: string;
    kabupaten?: string;
    kecamatan?: string;
    salesforce?: string;
    noRs?: string;
    alamat?: string;
    // Admin/Supervisor specific
    tap?: string; // Kantor cabang / area
    jabatan?: string;
    // Common
    photo?: string;
}

export interface User {
    id: string;
    password?: string;
    role: UserRole;
    points?: number;
    level?: string;
    kuponUndian?: number; // Tambah kupon undian
    profile: UserProfile;
}

export interface Transaction {
    id: number;
    userId: string;
    date: string;
    produk: string;
    harga: number;
    kuantiti: number;
    totalPembelian: number;
    points: number;
}

export interface Reward {
    id: number;
    name: string;
    points: number;
    image: string;
    stock: number;
}

export interface Redemption {
    id: number;
    userId: string;
    rewardName: string;
    pointsSpent: number;
    date: string;
}

// Tipe baru untuk menyatukan history
export type HistoryItem = {
    date: string;
    type: 'Pembelian' | 'Penukaran';
    description: string;
    amount: number; // Ini akan menjadi totalPembelian untuk pembelian
    points: number; // bisa positif atau negatif
};


export interface LoyaltyProgram {
    level: string;
    pointsNeeded: number;
    benefit: string;
    multiplier: number;
}

export interface RunningProgramTarget {
    userId: string;
    progress: number;
}

export interface RunningProgram {
    id: number;
    name: string;
    mechanism: string;
    prize: string;
    startDate: string; // ISO date string e.g. "2025-09-01"
    endDate: string;   // ISO date string e.g. "2025-09-30"
    image: string;     // URL for the program image
    targets: RunningProgramTarget[];
}

export interface DigiposData {
    [key: string]: {
        namaOutlet: string;
        noRs: string;
    };
}

export interface LocationData {
    [key: string]: { // Kabupaten
        [key: string]: string[]; // Kecamatan: Salesforce[]
    };
}

export interface RaffleProgram {
    id: number;
    name: string;
    prize: string;
    period: string; // e.g., "1 Sep - 30 Sep 2024"
    isActive: boolean;
}

export interface CouponRedemption {
    id: number;
    userId: string;
    raffleProgramId: number;
    redeemedAt: string; // ISO date string
}

export interface RaffleWinner {
    id: number;
    name: string;
    prize: string;
    photo: string;
    period: string;
}