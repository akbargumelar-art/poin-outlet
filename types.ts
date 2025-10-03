
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
    owner?: string;
    kabupaten?: string;
    kecamatan?: string;
    salesforce?: string;
    noRs?: string;
    alamat?: string;
    tap?: string; 
    jabatan?: string;
    photoUrl?: string; // Standardized to photoUrl
}

export interface User {
    id: string;
    password?: string;
    role: UserRole;
    points?: number;
    level?: string;
    kuponUndian?: number;
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
    pointsEarned: number;
}

export interface Reward {
    id: number;
    name: string;
    points: number;
    imageUrl: string;
    stock: number;
}

export interface Redemption {
    id: number;
    userId: string;
    rewardId: number;
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
    id: number;
    programId: number;
    userId: string;
    progress: number;
}

export type PrizeCategory = 'Barang' | 'Uang Tunai' | 'Saldo';

export interface RunningProgram {
    id: number;
    name: string;
    mechanism: string;
    prizeCategory: PrizeCategory;
    prizeDescription: string;
    startDate: string; // ISO date string e.g. "2025-09-01"
    endDate: string;   // ISO date string e.g. "2025-09-30"
    imageUrl: string;
    targets: RunningProgramTarget[];
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
    photoUrl: string;
    period: string;
}

export interface Location {
    id: number;
    kabupaten: string;
    kecamatan: string;
}