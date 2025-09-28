
export type UserRole = 'admin' | 'pelanggan';
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
    | 'manajemenPoin';

export interface UserProfile {
    nama: string;
    email: string;
    phone: string;
    owner?: string;
    kabupaten?: string;
    kecamatan?: string;
    salesforce?: string;
    noRs?: string;
    photo?: string;
    alamat?: string;
    tap?: string; // Tambah TAP untuk Admin
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
    amount: number;
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
    amount: number;
    points: number; // bisa positif atau negatif
};


export interface LoyaltyProgram {
    level: string;
    pointsNeeded: number;
    benefit: string;
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
    period: string;
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