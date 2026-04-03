import {
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { useFocusEffect } from 'expo-router';

import { db } from '@/src/firebase/firebase';
import { useAuth } from '@/src/context/AuthContext';

// ─── Type ─────────────────────────────────────────────────────────────────────

type Booking = {
  id: string;
  bookingId: string;
  pnr: string;
  busId: string;
  bus: {
    busName?: string;
    busType?: string;
    vehicleType?: string;
    stops?: string;
    departureMeridiem?: 'AM' | 'PM';
    departureAM?: boolean;
    arrivalMeridiem?: 'AM' | 'PM';
    arrivalAM?: boolean;
  };
  userId: string;
  userName: string;
  userEmail: string;
  seats: string[];
  seatIds: string[];
  passengerCount: number;
  totalPrice: number;
  bookingDate: string;
  status: string;
  createdAt: string;
  fromCity?: string;
  toCity?: string;
  departureTime?: string;
  departureMeridiem?: 'AM' | 'PM';
  arrivalTime?: string;
  arrivalMeridiem?: 'AM' | 'PM';
  duration?: string;
  cancelledBy?: string;
  cancelledByName?: string;
  cancelledAt?: string;
};

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

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyBookingsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBookingId, setActionBookingId] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const data: Booking[] = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          bookingId: d.bookingId ?? '',
          pnr: d.pnr ?? '',
          busId: d.busId ?? '',
          bus: d.bus ?? {},
          userId: d.userId ?? '',
          userName: d.userName ?? '',
          userEmail: d.userEmail ?? '',
          seats: d.seats ?? [],
          seatIds: d.seatIds ?? [],
          passengerCount: d.passengerCount ?? 0,
          totalPrice: d.totalPrice ?? 0,
          bookingDate: d.bookingDate ?? '',
          status: d.status ?? '',
          createdAt: d.createdAt ?? '',
          fromCity: d.bus?.fromCity ?? '',
          toCity: d.bus?.toCity ?? '',
          departureTime: d.bus?.departureTime ?? '',
          departureMeridiem: resolveMeridiem(d.bus?.departureMeridiem, d.bus?.departureAM),
          arrivalTime: d.bus?.arrivalTime ?? '',
          arrivalMeridiem: resolveMeridiem(d.bus?.arrivalMeridiem, d.bus?.arrivalAM),
          duration: d.bus?.duration ?? '',
          cancelledBy: d.cancelledBy ?? '',
          cancelledByName: d.cancelledByName ?? '',
          cancelledAt: d.cancelledAt ?? '',
        };
      });

      // Sort newest first
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBookings(data);
    } catch (err) {
      console.error('[MyBookings]', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const downloadTicketPdf = useCallback(async (booking: Booking) => {
    try {
      setActionBookingId(booking.id);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const html = buildTicketHtml(booking);
      const file = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ticket ${booking.bookingId}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF ready', `Ticket saved at: ${file.uri}`);
      }
    } catch (error) {
      console.error('[DownloadTicketPdf]', error);
      Alert.alert('Error', 'Could not generate ticket PDF. Please try again.');
    } finally {
      setActionBookingId(null);
    }
  }, []);

  const cancelBooking = useCallback((booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Cancel booking?',
      `Are you sure you want to cancel booking ${booking.bookingId}? It will be marked as cancelled.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionBookingId(booking.id);
              await updateDoc(doc(db, 'bookings', booking.id), {
                status: 'cancelled',
                cancelledBy: 'user',
                cancelledByUid: user?.uid ?? '',
                cancelledByName: 'User',
                cancelledAt: new Date().toISOString(),
              });
              await fetchBookings();
              Alert.alert('Cancelled', 'Your booking has been marked as cancelled.');
            } catch (error) {
              console.error('[CancelBooking]', error);
              Alert.alert('Error', 'Could not cancel booking. Please try again.');
            } finally {
              setActionBookingId(null);
            }
          },
        },
      ]
    );
  }, [fetchBookings]);

  // Refresh whenever tab is focused (so new bookings show immediately)
  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  // ── Render item ─────────────────────────────────────────────────────────────
  const renderBooking = ({ item, index }: { item: Booking; index: number }) => (
    <View style={card.wrapper}>
      {(() => {
        const departureDisplayTime = formatBusTime(item.departureTime, item.departureMeridiem);
        const arrivalDisplayTime = formatBusTime(item.arrivalTime, item.arrivalMeridiem);

        return (
          <>
      {/* Status badge */}
      <View style={card.statusRow}>
        {item.status === 'confirmed' ? (
          <View style={card.confirmedBadge}>
            <Ionicons name="checkmark-circle" size={12} color="#0ea663" />
            <Text style={card.confirmedText}>Confirmed</Text>
          </View>
        ) : (
          <View style={card.cancelledBadge}>
            <Ionicons name="close-circle" size={12} color="#dc2626" />
            <Text style={card.cancelledText}>Cancelled</Text>
          </View>
        )}
        <Text style={card.dateText}>{item.bookingDate}</Text>
      </View>

      {/* Route */}
      <View style={card.routeCard}>
        <View style={card.routeRow}>
          <Text style={[card.city, { textAlign: 'left' }]}>{item.fromCity || item.bus.busName}</Text>
          <View style={card.routeMid}>
            <View style={card.routeLine} />
            <Ionicons name="bus" size={14} color="#0ea663" />
            <View style={card.routeLine} />
          </View>
          <Text style={[card.city, { textAlign: 'right' }]}>{item.toCity}</Text>
        </View>

        {(item.departureTime || item.arrivalTime) ? (
          <View style={card.timeRow}>
            <Text style={[card.time, { textAlign: 'left' }]}>{departureDisplayTime}</Text>
            <Text style={card.duration}>{item.duration ? `• ${item.duration} •` : '• • •'}</Text>
            <Text style={[card.time, { textAlign: 'right' }]}>{arrivalDisplayTime}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={card.divider} />

      {/* Booking meta */}
      <View style={card.metaGrid}>
        <MetaCell label="PNR" value={item.pnr} highlight />
        <MetaCell label="Passengers" value={String(item.passengerCount)} />
        <MetaCell label="Seats" value={item.seats.join(', ')} />
        <MetaCell label="Total Paid" value={`₹${item.totalPrice}`} highlight />
      </View>

      {/* Bus info chip */}
      {item.bus?.busType ? (
        <View style={card.busChip}>
          <Ionicons name="bus-outline" size={13} color="#0ea663" />
          <Text style={card.busChipText}>
            {item.bus.busName} • {item.bus.busType}
            {item.bus.stops ? ` • Via ${item.bus.stops}` : ''}
          </Text>
        </View>
      ) : null}

      {item.status === 'confirmed' ? (
        <View style={card.actionRow}>
          <TouchableOpacity
            disabled={actionBookingId === item.id}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => downloadTicketPdf(item)}
            style={[card.actionButton, card.downloadButton]}
          >
            <Ionicons name="download-outline" size={16} color="#0ea663" />
            <Text style={card.downloadText}>Download ticket PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={actionBookingId === item.id}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => cancelBooking(item)}
            style={[card.actionButton, card.cancelButton]}
          >
            <Ionicons name="close-circle-outline" size={16} color="#dc2626" />
            <Text style={card.cancelText}>Cancel Booking</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={card.cancelledInfoWrap}>
          <Text style={card.cancelledInfoText}>
            {item.cancelledBy === 'admin'
              ? `This ticket was cancelled by admin${item.cancelledByName ? ` (${item.cancelledByName})` : ''}.`
              : 'This ticket is cancelled.'}
          </Text>
        </View>
      )}
          </>
        );
      })()}
    </View>
  );

  // ── Empty state ─────────────────────────────────────────────────────────────
  const ListEmpty = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="ticket-outline" size={40} color="#0ea663" />
      </View>
      <Text style={styles.emptyTitle}>No bookings yet</Text>
      <Text style={styles.emptySubtitle}>
        When you book a bus ticket, your trip details will appear here.
      </Text>
    </View>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Bookings</Text>
        <TouchableOpacity onPress={fetchBookings} hitSlop={8} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#0ea663" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0ea663" />
          <Text style={styles.loadingText}>Loading your trips…</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={renderBooking}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && styles.listContentCentered,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ─── MetaCell ─────────────────────────────────────────────────────────────────

function MetaCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={meta.cell}>
      <Text style={meta.label}>{label}</Text>
      <Text style={[meta.value, highlight && meta.highlighted]}>{value}</Text>
    </View>
  );
}

function buildTicketHtml(booking: Booking) {
  const bus = booking.bus || {};
  const seats = booking.seats.join(', ');
  const routeText = `${booking.fromCity || ''} → ${booking.toCity || ''}`;
  const boardingPassCode = `${booking.bookingId.slice(0, 4)}-${booking.pnr}`;
  const duration = booking.duration || '';
  const departureDisplayTime = formatBusTime(booking.departureTime, booking.departureMeridiem);
  const arrivalDisplayTime = formatBusTime(booking.arrivalTime, booking.arrivalMeridiem);

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f3faf8; color: #0f172a; }
          .ticket {
            background: #ffffff;
            border: 1px solid #dbe9e2;
            border-radius: 22px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
          }
          .hero {
            background: linear-gradient(135deg, #0ea663 0%, #12b76a 100%);
            color: #ffffff;
            padding: 22px 24px 20px;
          }
          .brandRow { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
          .brand { font-size: 30px; font-weight: 800; line-height: 1; }
          .subtitle { margin-top: 8px; font-size: 13px; opacity: 0.95; }
          .codePill {
            background: rgba(255,255,255,0.18);
            border: 1px solid rgba(255,255,255,0.24);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          }
          .body { padding: 22px 22px 20px; }
          .topGrid { display: flex; gap: 14px; }
          .panel {
            flex: 1;
            background: #f8fbfa;
            border: 1px solid #e5eee8;
            border-radius: 16px;
            padding: 14px;
          }
          .miniLabel { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; }
          .miniValue { margin-top: 6px; font-size: 16px; font-weight: 800; color: #0f172a; }
          .greenValue { color: #0ea663; }
          .section { margin-top: 18px; }
          .sectionTitle { color: #475467; font-size: 11px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 10px; }
          .routeBox {
            background: #f8fbfa;
            border: 1px solid #e5eee8;
            border-radius: 18px;
            padding: 16px;
          }
          .routeRow { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
          .routeCity { font-size: 17px; font-weight: 800; color: #0f172a; width: 36%; }
          .routeCity.right { text-align: right; }
          .routeMiddle { flex: 1; text-align: center; }
          .routeLine { height: 2px; background: #0ea663; margin: 9px 0 6px; position: relative; }
          .routeLine:after { content: ''; position: absolute; right: -1px; top: -3px; width: 0; height: 0; border-left: 7px solid #0ea663; border-top: 4px solid transparent; border-bottom: 4px solid transparent; }
          .routeInfo { color: #0ea663; font-size: 11px; font-weight: 800; }
          .grid2 { display: flex; gap: 12px; flex-wrap: wrap; }
          .cell { width: calc(50% - 6px); background: #ffffff; border: 1px solid #eef2f7; border-radius: 14px; padding: 12px; }
          .label { color: #64748b; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { margin-top: 6px; font-size: 14px; font-weight: 700; color: #0f172a; word-break: break-word; }
          .value.green { color: #0ea663; }
          .footerBox { margin-top: 18px; background: #ebf8f2; border: 1px solid #c8e6d5; border-radius: 18px; padding: 16px; }
          .footerRow { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
          .amountLabel { font-size: 13px; font-weight: 700; color: #0f172a; }
          .amountValue { font-size: 22px; font-weight: 900; color: #0ea663; letter-spacing: 0.4px; }
          .note { margin-top: 16px; border-top: 1px dashed #dbe9e2; padding-top: 12px; color: #64748b; font-size: 11px; line-height: 1.5; text-align: center; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="hero">
            <div class="brandRow">
              <div>
                <div class="brand">GoBus</div>
                <div class="subtitle">E-Ticket / Boarding Pass</div>
              </div>
              <div class="codePill">${booking.status.toUpperCase()}</div>
            </div>
          </div>

          <div class="body">
            <div class="topGrid">
              <div class="panel">
                <div class="miniLabel">Booking ID</div>
                <div class="miniValue greenValue">${booking.bookingId}</div>
              </div>
              <div class="panel">
                <div class="miniLabel">PNR Number</div>
                <div class="miniValue">${booking.pnr}</div>
              </div>
            </div>

            <div class="section">
              <div class="sectionTitle">Passenger Details</div>
              <div class="grid2">
                <div class="cell">
                  <div class="label">Name</div>
                  <div class="value">${booking.userName}</div>
                </div>
                <div class="cell">
                  <div class="label">Email</div>
                  <div class="value">${booking.userEmail}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="sectionTitle">Journey Details</div>
              <div class="routeBox">
                <div class="routeRow">
                  <div class="routeCity">${departureDisplayTime}</div>
                  <div class="routeMiddle">
                    <div class="routeInfo">${duration}</div>
                    <div class="routeLine"></div>
                    <div class="routeInfo">${bus.busType || ''}</div>
                  </div>
                  <div class="routeCity right">${arrivalDisplayTime}</div>
                </div>
                <div class="routeRow" style="margin-top: 6px;">
                  <div class="routeCity" style="font-size: 13px; font-weight: 600; color: #64748b;">${booking.fromCity || ''}</div>
                  <div class="routeMiddle"></div>
                  <div class="routeCity right" style="font-size: 13px; font-weight: 600; color: #64748b;">${booking.toCity || ''}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <div class="sectionTitle">Booking Information</div>
              <div class="grid2">
                <div class="cell">
                  <div class="label">Booking Date</div>
                  <div class="value">${booking.bookingDate}</div>
                </div>
                <div class="cell">
                  <div class="label">Seats</div>
                  <div class="value green">${seats}</div>
                </div>
                <div class="cell">
                  <div class="label">Passengers</div>
                  <div class="value">${booking.passengerCount}</div>
                </div>
                <div class="cell">
                  <div class="label">Bus</div>
                  <div class="value">${bus.busName || bus.name || ''}</div>
                </div>
                <div class="cell">
                  <div class="label">Bus Type</div>
                  <div class="value">${bus.busType || bus.typeLabel || ''}</div>
                </div>
                <div class="cell">
                  <div class="label">Vehicle</div>
                  <div class="value">${bus.vehicleType || bus.vehicle || ''}</div>
                </div>
                <div class="cell">
                  <div class="label">Route</div>
                  <div class="value">${routeText}</div>
                </div>
                <div class="cell">
                  <div class="label">Booking Code</div>
                  <div class="value">${boardingPassCode}</div>
                </div>
                <div class="cell">
                  <div class="label">Departure City</div>
                  <div class="value">${bus.departureCity || booking.fromCity || ''}</div>
                </div>
                <div class="cell">
                  <div class="label">Arrival City</div>
                  <div class="value">${bus.arrivalCity || booking.toCity || ''}</div>
                </div>
                <div class="cell">
                  <div class="label">Stops</div>
                  <div class="value">${bus.stops || 'Direct'}</div>
                </div>
                <div class="cell">
                  <div class="label">Status</div>
                  <div class="value green">${booking.status}</div>
                </div>
              </div>
            </div>

            <div class="footerBox">
              <div class="footerRow">
                <div class="amountLabel">Total Amount Paid</div>
                <div class="amountValue">₹${booking.totalPrice}</div>
              </div>
            </div>

            <div class="note">
              This is a computer-generated ticket. No signature required.<br/>
              Thank you for choosing GoBus!
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: { backgroundColor: '#f3faf8', flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4efe9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '800' },
  refreshBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  listContentCentered: { flex: 1, justifyContent: 'center' },
  loadingState: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingHorizontal: 32 },
  emptyIconCircle: {
    alignItems: 'center',
    backgroundColor: '#ebf8f2',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 20,
    width: 80,
  },
  emptyTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptySubtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center' },
});

const card = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff',
    borderColor: '#c8e6d5',
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 14,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#0ea663', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 4 },
    }),
  },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  confirmedBadge: {
    alignItems: 'center',
    backgroundColor: '#ebf8f2',
    borderColor: '#a7f3d0',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confirmedText: { color: '#0ea663', fontSize: 11, fontWeight: '700' },
  cancelledBadge: {
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cancelledText: { color: '#dc2626', fontSize: 11, fontWeight: '700' },
  dateText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  routeCard: {
    backgroundColor: '#f8fbfa',
    borderColor: '#e7eeea',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  routeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  city: { color: '#0f172a', fontSize: 15, fontWeight: '800', flex: 1 },
  routeMid: { alignItems: 'center', flex: 1.15, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  routeLine: { backgroundColor: '#0ea663', flex: 1, height: 1.5, opacity: 0.85 },
  timeRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: '#334155', fontSize: 13, fontWeight: '700', flex: 1 },
  duration: { color: '#98a2b3', fontSize: 13, fontWeight: '700', flex: 1.15, textAlign: 'center' },
  divider: { backgroundColor: '#f1f5f9', height: 1, marginVertical: 12 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  busChip: {
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  busChipText: { color: '#166534', fontSize: 12, fontWeight: '600' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 11,
  },
  downloadButton: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
  },
  cancelButton: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderWidth: 1,
  },
  downloadText: { color: '#0ea663', fontSize: 12, fontWeight: '800' },
  cancelText: { color: '#dc2626', fontSize: 12, fontWeight: '800' },
  cancelledInfoWrap: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cancelledInfoText: {
    color: '#b42318',
    fontSize: 12,
    fontWeight: '600',
  },
});

const meta = StyleSheet.create({
  cell: { width: '47%' },
  label: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  value: { color: '#0f172a', fontSize: 13, fontWeight: '700' },
  highlighted: { color: '#0ea663', fontSize: 14, fontWeight: '800' },
});
