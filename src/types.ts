
export type UserRole = 'admin' | 'pelanggan' | 'supervisor' | 'operator';
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
    | 'manajemenUndian'
    | 'manajemenPenukaran'
    | 'manajemenNotifikasi'
    | 'nomorSpesial'
    | 'manajemenNomor'
    | 'manajemenTransaksi'
    | 'manajemenAktivitas';

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
    photoUrl?: string;
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
    userName?: string;
    userTap?: string;
    status?: string;
    statusNote?: string;
    statusUpdatedAt?: string;
    documentationPhotoUrl?: string;
    receiverName?: string;
    receiverRole?: string;
    surveyorName?: string;
    locationCoordinates?: string;
}

export type HistoryItem = {
    id?: number;
    date: string;
    type: 'Pembelian' | 'Penukaran';
    description: string;
    amount: number;
    points: number;
    harga?: number;
    kuantiti?: number;
    status?: string;
    statusNote?: string;
    statusUpdatedAt?: string;
    documentationPhotoUrl?: string;
    receiverName?: string;
    receiverRole?: string;
    surveyorName?: string;
    locationCoordinates?: string;
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
    startDate: string;
    endDate: string;
    imageUrl: string;
    targets: RunningProgramTarget[];
}

export interface RaffleProgram {
    id: number;
    name: string;
    prize: string;
    period: string;
    isActive: boolean;
}

export interface CouponRedemption {
    id: number;
    userId: string;
    raffleProgramId: number;
    redeemedAt: string;
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

export interface SpecialNumber {
    id: number;
    phoneNumber: string;
    price: number;
    isSold: boolean;
    sn?: string;
    lokasi?: string;
}

export interface WhatsAppSettings {
    webhookUrl: string;
    senderNumber: string;
    recipientType: 'personal' | 'group';
    recipientId: string;
    apiKey: string;
    sessionName?: string;
    specialNumberRecipient: string;
    specialNumberStatusRecipientType: 'personal' | 'group'; // New field
    specialNumberStatusRecipientId: string; // New field
}
