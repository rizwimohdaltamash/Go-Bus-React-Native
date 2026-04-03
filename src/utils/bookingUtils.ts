import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/src/firebase/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BookingData = {
  bookingId: string;
  pnr: string;
  busId: string;
  bus: object;
  userId: string;
  userName: string;
  userEmail: string;
  seats: string[];       // e.g. ["L1", "L2"]
  seatIds: string[];     // e.g. ["L-1-1", "L-1-2"]
  passengerCount: number;
  totalPrice: number;
  bookingDate: string;
  status: 'confirmed';
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateBookingId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/** Convert display seat label (e.g. "L1", "U3") → Firestore seatId ("L-1-1", "U-1-3") */
export function seatLabelToId(label: string): string {
  // label format: "L1" → prefix="L", num=1
  // seatId format: "L-{row}-{col}" where row = ceil(num/6), col = ((num-1)%6)+1
  const prefix = label[0];
  const num = parseInt(label.slice(1), 10);
  const row = Math.ceil(num / 6);
  const col = ((num - 1) % 6) + 1;
  return `${prefix}-${row}-${col}`;
}

/** Fetch all booked seatIds for a given busId from the bookings collection */
export async function fetchBookedSeatIds(busId: string): Promise<string[]> {
  try {
    const q = query(
      collection(db, 'bookings'),
      where('busId', '==', busId),
      where('status', '==', 'confirmed')
    );
    const snap = await getDocs(q);
    const ids: string[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.seatIds)) {
        ids.push(...data.seatIds);
      }
    });
    return ids;
  } catch (err) {
    console.error('[fetchBookedSeatIds]', err);
    return [];
  }
}

/** Save a confirmed booking to Firestore */
export async function saveBooking(data: BookingData): Promise<void> {
  await addDoc(collection(db, 'bookings'), data);
}

/** Format today as "Day, D Month YYYY" */
export function formatBookingDate(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
