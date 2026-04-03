import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';

import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/firebase/firebase';

type BookingStatusFilter = 'all' | 'confirmed' | 'cancelled';

type AdminBus = {
  id: string;
  busName?: string;
  fromCity?: string;
  toCity?: string;
  departureTime?: string;
  arrivalTime?: string;
  departureMeridiem?: 'AM' | 'PM';
  arrivalMeridiem?: 'AM' | 'PM';
};

type AdminBooking = {
  id: string;
  bookingId: string;
  pnr: string;
  busId: string;
  status: string;
  bookingDate: string;
  createdAt: string;
  passengerCount: number;
  totalPrice: number;
  userName: string;
  userEmail: string;
  seats: string[];
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  departureMeridiem?: 'AM' | 'PM';
  arrivalMeridiem?: 'AM' | 'PM';
  busName: string;
  cancelledBy?: string;
  cancelledByName?: string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function resolveMeridiem(meridiem?: 'AM' | 'PM', isAm?: boolean): 'AM' | 'PM' | '' {
  if (meridiem === 'AM' || meridiem === 'PM') {
    return meridiem;
  }

  if (typeof isAm === 'boolean') {
    return isAm ? 'AM' : 'PM';
  }

  return '';
}

function formatBusTime(time?: string, meridiem?: 'AM' | 'PM'): string {
  const safeTime = String(time ?? '').trim();

  if (!safeTime) {
    return '--';
  }

  return meridiem ? `${safeTime} ${meridiem}` : safeTime;
}

export default function AdminBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<BookingStatusFilter>('all');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);

  const loadAdminBookings = useCallback(async () => {
    if (!profile?.uid) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const myBusesQuery = query(collection(db, 'buses'), where('adminUid', '==', profile.uid));
      const myBusesSnap = await getDocs(myBusesQuery);

      const adminBuses = myBusesSnap.docs.map((busDoc) => ({
        id: busDoc.id,
        ...(busDoc.data() as Omit<AdminBus, 'id'>),
      }));

      const busIds = adminBuses.map((bus) => bus.id);
      const busMap = new Map(adminBuses.map((bus) => [bus.id, bus]));

      if (busIds.length === 0) {
        setBookings([]);
        return;
      }

      const chunks = chunkArray(busIds, 10);
      const bookingSnaps = await Promise.all(
        chunks.map((chunk) =>
          getDocs(query(collection(db, 'bookings'), where('busId', 'in', chunk))),
        ),
      );

      const mergedBookings: AdminBooking[] = [];

      bookingSnaps.forEach((snapshot) => {
        snapshot.docs.forEach((bookingDoc) => {
          const data = bookingDoc.data();
          const busId = String(data.busId ?? '');

          if (!busMap.has(busId)) {
            return;
          }

          const ownedBus = busMap.get(busId);
          const busData = (data.bus ?? {}) as Record<string, unknown>;

          const departureMeridiem = resolveMeridiem(
            busData.departureMeridiem as 'AM' | 'PM' | undefined,
            busData.departureAM as boolean | undefined,
          );
          const arrivalMeridiem = resolveMeridiem(
            busData.arrivalMeridiem as 'AM' | 'PM' | undefined,
            busData.arrivalAM as boolean | undefined,
          );

          mergedBookings.push({
            id: bookingDoc.id,
            bookingId: String(data.bookingId ?? ''),
            pnr: String(data.pnr ?? ''),
            busId,
            status: String(data.status ?? ''),
            bookingDate: String(data.bookingDate ?? ''),
            createdAt: String(data.createdAt ?? ''),
            passengerCount: Number(data.passengerCount ?? 0),
            totalPrice: Number(data.totalPrice ?? 0),
            userName: String(data.userName ?? 'Unknown User'),
            userEmail: String(data.userEmail ?? '-'),
            seats: Array.isArray(data.seats) ? data.seats.map(String) : [],
            fromCity: String(busData.fromCity ?? ownedBus?.fromCity ?? ''),
            toCity: String(busData.toCity ?? ownedBus?.toCity ?? ''),
            departureTime: String(busData.departureTime ?? ownedBus?.departureTime ?? ''),
            arrivalTime: String(busData.arrivalTime ?? ownedBus?.arrivalTime ?? ''),
            departureMeridiem: departureMeridiem || undefined,
            arrivalMeridiem: arrivalMeridiem || undefined,
            busName: String(busData.busName ?? ownedBus?.busName ?? 'My Bus'),
            cancelledBy: String(data.cancelledBy ?? ''),
            cancelledByName: String(data.cancelledByName ?? ''),
          });
        });
      });

      mergedBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(mergedBookings);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile?.uid]);

  useFocusEffect(
    useCallback(() => {
      loadAdminBookings();
    }, [loadAdminBookings]),
  );

  const filteredBookings = useMemo(() => {
    if (activeFilter === 'all') {
      return bookings;
    }

    return bookings.filter((booking) => booking.status === activeFilter);
  }, [activeFilter, bookings]);

  const totals = useMemo(() => {
    const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length;
    const cancelled = bookings.filter((booking) => booking.status === 'cancelled').length;

    return {
      all: bookings.length,
      confirmed,
      cancelled,
    };
  }, [bookings]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminBookings();
  };

  const renderFilter = (filter: BookingStatusFilter, label: string, count: number) => {
    const isActive = activeFilter === filter;

    return (
      <Pressable
        key={filter}
        onPress={() => setActiveFilter(filter)}
        style={[styles.filterPill, isActive && styles.filterPillActive]}
      >
        <Text style={[styles.filterText, isActive && styles.filterTextActive]}>{`${label} (${count})`}</Text>
      </Pressable>
    );
  };

  const cancelBookingByAdmin = (booking: AdminBooking) => {
    Alert.alert(
      'Cancel User Booking',
      `Cancel booking ${booking.bookingId}? User will see this ticket as cancelled.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingBookingId(booking.id);
              await updateDoc(doc(db, 'bookings', booking.id), {
                status: 'cancelled',
                cancelledBy: 'admin',
                cancelledByUid: profile?.uid ?? '',
                cancelledByName: profile?.name ?? 'Bus Admin',
                cancelledAt: new Date().toISOString(),
              });
              await loadAdminBookings();
            } finally {
              setCancellingBookingId(null);
            }
          },
        },
      ],
    );
  };

  const renderBooking = ({ item }: { item: AdminBooking }) => {
    const departureDisplay = formatBusTime(item.departureTime, item.departureMeridiem);
    const arrivalDisplay = formatBusTime(item.arrivalTime, item.arrivalMeridiem);

    return (
      <View style={styles.bookingCard}>
        <View style={styles.bookingTopRow}>
          <View style={styles.bookingLeft}>
            <Text numberOfLines={1} style={styles.busName}>{item.busName}</Text>
            <Text numberOfLines={1} style={styles.routeText}>{`${item.fromCity} -> ${item.toCity}`}</Text>
          </View>
          <View style={[styles.statusBadge, item.status === 'confirmed' ? styles.badgeConfirmed : styles.badgeCancelled]}>
            <Text style={[styles.statusBadgeText, item.status === 'confirmed' ? styles.badgeTextConfirmed : styles.badgeTextCancelled]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta label="BOOKING" value={item.bookingId || '-'} />
          <Meta label="PNR" value={item.pnr || '-'} />
        </View>

        <View style={styles.metaRow}>
          <Meta label="DEPART" value={departureDisplay} />
          <Meta label="ARRIVE" value={arrivalDisplay} />
        </View>

        <View style={styles.metaRow}>
          <Meta label="PASSENGER" value={item.userName} />
          <Meta label="SEATS" value={item.seats.join(', ') || '-'} />
        </View>

        <View style={styles.metaRow}>
          <Meta label="EMAIL" value={item.userEmail} />
          <Meta label="PAID" value={`₹${item.totalPrice}`} />
        </View>

        {item.status === 'confirmed' ? (
          <View style={styles.actionRow}>
            <Pressable
              disabled={cancellingBookingId === item.id}
              onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              onPress={() => cancelBookingByAdmin(item)}
              style={[styles.cancelBtn, cancellingBookingId === item.id && styles.cancelBtnDisabled]}
            >
              {cancellingBookingId === item.id ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons color="#ffffff" name="close-circle" size={15} />
                  <Text style={styles.cancelBtnText}>Cancel Booking</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          <Text style={styles.cancelledNote}>
            {item.cancelledBy === 'user'
              ? 'Cancelled by user'
              : item.cancelledBy === 'admin'
                ? `Cancelled by admin${item.cancelledByName ? ` (${item.cancelledByName})` : ''}`
                : 'Ticket already cancelled'}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>User Bookings</Text>
      <Text style={styles.subtitle}>Only bookings on your buses are shown (admin-specific).</Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCount}>{totals.all}</Text>
          <Text style={styles.statLabel}>TOTAL</Text>
        </View>
        <View style={[styles.statCard, styles.statCardConfirmed]}>
          <Text style={[styles.statCount, styles.statCountConfirmed]}>{totals.confirmed}</Text>
          <Text style={styles.statLabel}>CONFIRMED</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCancelled]}>
          <Text style={[styles.statCount, styles.statCountCancelled]}>{totals.cancelled}</Text>
          <Text style={styles.statLabel}>CANCELLED</Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        {renderFilter('all', 'All', totals.all)}
        {renderFilter('confirmed', 'Confirmed', totals.confirmed)}
        {renderFilter('cancelled', 'Cancelled', totals.cancelled)}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0f8d59" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={44} color="#c3cad6" />
              <Text style={styles.emptyTitle}>No bookings found</Text>
              <Text style={styles.emptySubtitle}>Users have not booked any seats on your buses yet.</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f3faf8',
    flex: 1,
    paddingHorizontal: 20,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dce6e3',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  actionRow: {
    marginTop: 8,
  },
  bookingLeft: {
    flex: 1,
    marginRight: 10,
  },
  bookingTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  busName: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 38,
  },
  cancelBtnDisabled: {
    opacity: 0.7,
  },
  cancelBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelledNote: {
    color: '#b42318',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  routeText: {
    color: '#667085',
    fontSize: 13,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  emptySubtitle: {
    color: '#98a2b3',
    fontSize: 15,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#344054',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  filterPill: {
    backgroundColor: '#ffffff',
    borderColor: '#d4dae3',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
    marginTop: 6,
  },
  filterText: {
    color: '#344054',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  listContent: {
    paddingBottom: 30,
  },
  loadingState: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e4e7ec',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    paddingVertical: 30,
  },
  loadingText: {
    color: '#667085',
    fontSize: 14,
    marginTop: 10,
  },
  metaCell: {
    flex: 1,
    minWidth: 0,
  },
  metaLabel: {
    color: '#98a2b3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  metaValue: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d4dae3',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  statCardCancelled: {
    borderColor: '#fecaca',
  },
  statCardConfirmed: {
    borderColor: '#bbf7d0',
  },
  statCount: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '800',
  },
  statCountCancelled: {
    color: '#dc2626',
  },
  statCountConfirmed: {
    color: '#16a34a',
  },
  statLabel: {
    color: '#667085',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    marginTop: 16,
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeCancelled: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  badgeConfirmed: {
    backgroundColor: '#ecfdf3',
    borderColor: '#bbf7d0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextCancelled: {
    color: '#b91c1c',
  },
  badgeTextConfirmed: {
    color: '#166534',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    marginTop: 8,
  },
});
