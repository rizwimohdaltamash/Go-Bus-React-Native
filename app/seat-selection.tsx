import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/src/context/AuthContext';
import {
  generateBookingId,
  generatePNR,
  fetchBookedSeatIds,
  seatLabelToId,
  saveBooking,
  formatBookingDate,
} from '@/src/utils/bookingUtils';

// ─── Constants ────────────────────────────────────────────────────────────────

type Seat = { id: string };

const SEATS_PER_ROW = 6;
const SEATS_PER_DECK = 18;

function resolveMeridiem(meridiem?: unknown, isAm?: unknown): 'AM' | 'PM' | '' {
  if (meridiem === 'AM' || meridiem === 'PM') {
    return meridiem;
  }

  if (typeof isAm === 'boolean') {
    return isAm ? 'AM' : 'PM';
  }

  return '';
}

function formatBusTime(time?: unknown, meridiem?: unknown, isAm?: unknown): string {
  const safeTime = String(time ?? '').trim();

  if (!safeTime) {
    return '--';
  }

  const suffix = resolveMeridiem(meridiem, isAm);
  return suffix ? `${safeTime} ${suffix}` : safeTime;
}

function normalizeDateString(dateValue?: unknown): string {
  const text = String(dateValue ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return '';
  }

  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return '';
  }

  return text;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SeatSelectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuth();

  // ── Parse bus data ──────────────────────────────────────────────────────────
  const busData = useMemo(() => {
    try {
      if (typeof params.bus === 'string') return JSON.parse(params.bus);
      return params.bus || {};
    } catch {
      return {};
    }
  }, [params]);

  // ── Seat state ──────────────────────────────────────────────────────────────
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  /** bookedSeats passed from search (already-booked seatIds like "L-1-1") */
  const initialBookedSeatIds: string[] = useMemo(() => {
    const raw = (busData as { bookedSeats?: unknown }).bookedSeats;
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is string => typeof s === 'string');
  }, [busData]);
  const [bookedSeatIds, setBookedSeatIds] = useState<string[]>(() => initialBookedSeatIds);
  const [refreshingSeats, setRefreshingSeats] = useState(false);

  const busId = String(busData.id || busData.busId || '');

  const refreshBookedSeats = useCallback(async (silent = false) => {
    if (!busId) {
      return;
    }

    if (!silent) {
      setRefreshingSeats(true);
    }

    try {
      const latestBookedSeatIds = await fetchBookedSeatIds(busId);
      setBookedSeatIds(latestBookedSeatIds);

      // Deselect seats that became unavailable while user was on this screen.
      setSelectedSeats((prev) => prev.filter((seat) => !latestBookedSeatIds.includes(seatLabelToId(seat))));
    } finally {
      if (!silent) {
        setRefreshingSeats(false);
      }
    }
  }, [busId]);

  useEffect(() => {
    refreshBookedSeats(true);
  }, [refreshBookedSeats]);

  const lowerDeckSeats = useMemo(() => generateSeats('L', SEATS_PER_DECK), []);
  const upperDeckSeats = useMemo(() => generateSeats('U', SEATS_PER_DECK), []);

  // ── Derived values ──────────────────────────────────────────────────────────
  const price = Number(busData.price || 950);
  const totalPrice = selectedSeats.length * price;
  const fromCity = String(busData.fromCity || 'From');
  const toCity = String(busData.toCity || 'To');
  const departureTime = formatBusTime(
    busData.departureTime || busData.departure,
    busData.departureMeridiem,
    busData.departureAM,
  );
  const arrivalTime = formatBusTime(
    busData.arrivalTime || busData.arrival,
    busData.arrivalMeridiem,
    busData.arrivalAM,
  );
  const duration = String(busData.duration || '--');
  const selectedJourneyDate = useMemo(() => {
    const rawDate = Array.isArray(params.journeyDate) ? params.journeyDate[0] : params.journeyDate;
    const fromParam = normalizeDateString(rawDate);

    if (fromParam) {
      return fromParam;
    }

    const fromBusStart = normalizeDateString(busData.startDate);
    if (fromBusStart) {
      return fromBusStart;
    }

    return formatBookingDate();
  }, [busData.startDate, params.journeyDate]);

  // ── Payment state ───────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [paymentChoiceVisible, setPaymentChoiceVisible] = useState(false);
  const [resultModal, setResultModal] = useState<{
    visible: boolean;
    success: boolean;
    paymentId?: string;
    bookingId?: string;
    pnr?: string;
    errorMessage?: string;
  }>({ visible: false, success: false });

  // ── Seat helpers ────────────────────────────────────────────────────────────
  /**
   * Seat display IDs are "L1"-"L18", "U1"-"U18".
   * Booked seatIds from Firestore are "L-1-1", "L-1-2", …
   * We convert both sides for comparison.
   */
  function isSeatBooked(seatLabel: string): boolean {
    const id = seatLabelToId(seatLabel);
    return bookedSeatIds.includes(id);
  }

  function getSeatStatus(seatLabel: string): 'booked' | 'selected' | 'available' {
    if (isSeatBooked(seatLabel)) return 'booked';
    if (selectedSeats.includes(seatLabel)) return 'selected';
    return 'available';
  }

  function toggleSeat(seatLabel: string) {
    if (isSeatBooked(seatLabel)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSeats(prev =>
      prev.includes(seatLabel)
        ? prev.filter(s => s !== seatLabel)
        : [...prev, seatLabel]
    );
  }

  // ── Payment handlers ────────────────────────────────────────────────────────
  async function handleProceed() {
    if (selectedSeats.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPaymentChoiceVisible(true);
  }

  async function handlePaymentSuccess(response: { razorpay_payment_id: string }) {
    setSaving(true);
    try {
      const bookingId = generateBookingId();
      const pnr = generatePNR();
      const seatIds = selectedSeats.map(seatLabelToId);
      const normalizedBus = {
        ...busData,
        id: String(busData.id || busData.busId || ''),
        busName: String(busData.busName || busData.name || ''),
        name: String(busData.name || busData.busName || ''),
        busType: String(busData.busType || busData.typeLabel || ''),
        typeLabel: String(busData.typeLabel || busData.busType || ''),
        vehicleType: String(busData.vehicleType || busData.vehicle || ''),
        vehicle: String(busData.vehicle || busData.vehicleType || ''),
        fromCity: String(busData.fromCity || busData.departureCity || ''),
        departureCity: String(busData.departureCity || busData.fromCity || ''),
        toCity: String(busData.toCity || busData.arrivalCity || ''),
        arrivalCity: String(busData.arrivalCity || busData.toCity || ''),
        departureTime: String(busData.departureTime || busData.departure || ''),
        departure: String(busData.departure || busData.departureTime || ''),
        departureMeridiem: resolveMeridiem(busData.departureMeridiem, busData.departureAM),
        departureAM:
          typeof busData.departureAM === 'boolean'
            ? busData.departureAM
            : resolveMeridiem(busData.departureMeridiem, undefined) === 'AM',
        arrivalTime: String(busData.arrivalTime || busData.arrival || ''),
        arrival: String(busData.arrival || busData.arrivalTime || ''),
        arrivalMeridiem: resolveMeridiem(busData.arrivalMeridiem, busData.arrivalAM),
        arrivalAM:
          typeof busData.arrivalAM === 'boolean'
            ? busData.arrivalAM
            : resolveMeridiem(busData.arrivalMeridiem, undefined) === 'AM',
        duration: String(busData.duration || ''),
        price: Number(busData.price || 0),
        stops: String(busData.stops || ''),
        totalSeats: Number(busData.totalSeats || SEATS_PER_DECK * 2),
      };

      await saveBooking({
        bookingId,
        pnr,
        busId: normalizedBus.id,
        bus: normalizedBus,
        userId: user?.uid ?? '',
        userName: profile?.name ?? '',
        userEmail: user?.email ?? '',
        seats: selectedSeats,
        seatIds,
        passengerCount: selectedSeats.length,
        totalPrice,
        bookingDate: selectedJourneyDate,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResultModal({
        visible: true,
        success: true,
        paymentId: response.razorpay_payment_id,
        bookingId,
        pnr,
      });
    } catch (err) {
      console.error('[saveBooking]', err);
      Alert.alert('Warning', 'Payment received but booking could not be saved. Please contact support.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentChoiceSuccess() {
    setPaymentChoiceVisible(false);
    const simulatedPaymentId = `SIM_${Date.now()}`;
    await handlePaymentSuccess({ razorpay_payment_id: simulatedPaymentId });
  }

  function handlePaymentChoiceFailure() {
    setPaymentChoiceVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setResultModal({
      visible: true,
      success: false,
      errorMessage: 'Payment marked as failed. Please try again.',
    });
  }

  function handleResultClose() {
    setResultModal(r => ({ ...r, visible: false }));
    if (resultModal.success) {
      router.replace('/(tabs)/my-bookings');
    }
  }

  // ── Deck renderer ───────────────────────────────────────────────────────────
  function renderDeck(
    title: string,
    seats: Seat[],
    iconName: 'arrow-down-circle' | 'arrow-up-circle'
  ) {
    const rows: Seat[][] = [];
    for (let i = 0; i < seats.length; i += SEATS_PER_ROW) {
      rows.push(seats.slice(i, i + SEATS_PER_ROW));
    }

    return (
      <View style={styles.deckCard}>
        <View style={styles.deckHeader}>
          <Ionicons color="#0ea663" name={iconName} size={18} />
          <Text style={styles.deckTitle}>{title}</Text>
        </View>

        <View style={styles.seatGrid}>
          {rows.map((row, rowIndex) => (
            <View key={`${title}-${rowIndex}`}>
              <View style={[styles.seatRow, rowIndex > 0 && styles.seatRowSpaced]}>
                {row.map(seat => {
                  const status = getSeatStatus(seat.id);
                  return (
                    <TouchableOpacity
                      key={seat.id}
                      activeOpacity={status === 'booked' ? 1 : 0.75}
                      disabled={status === 'booked'}
                      onPress={() => toggleSeat(seat.id)}
                      style={[
                        styles.seat,
                        status === 'selected' && styles.seatSelected,
                        status === 'booked' && styles.seatBooked,
                      ]}
                    >
                      <Text
                        style={[
                          styles.seatText,
                          status === 'selected' && styles.seatTextSelected,
                          status === 'booked' && styles.seatTextBooked,
                        ]}
                      >
                        {seat.id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {rowIndex === 0 ? <View style={styles.firstRowDivider} /> : null}
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.page, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity hitSlop={10} onPress={() => router.back()} style={styles.backButton}>
          <Ionicons color="#0f172a" name="chevron-back" size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Seats</Text>
        <TouchableOpacity
          disabled={refreshingSeats}
          hitSlop={10}
          onPress={() => refreshBookedSeats(false)}
          style={styles.refreshButton}
        >
          {refreshingSeats ? (
            <ActivityIndicator color="#0f8d59" size="small" />
          ) : (
            <Ionicons color="#0f8d59" name="refresh" size={20} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Route Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.routeRow}>
            <Text style={styles.routeText}>{fromCity}</Text>
            <Ionicons color="#0ea663" name="arrow-forward" size={16} />
            <Text style={styles.routeText}>{toCity}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Departs</Text>
              <Text style={styles.metaValue}>{departureTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Arrives</Text>
              <Text style={styles.metaValue}>{arrivalTime}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Price / seat</Text>
              <Text style={styles.priceValue}>₹{price}</Text>
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendCard}>
          <LegendItem label="Available" style={styles.legendAvailable} />
          <LegendItem label="Selected" style={styles.legendSelected} />
          <LegendItem label="Booked" style={styles.legendBooked} />
        </View>

        {renderDeck('Lower Deck', lowerDeckSeats, 'arrow-down-circle')}
        {renderDeck('Upper Deck', upperDeckSeats, 'arrow-up-circle')}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <View>
          <Text style={styles.selectedCount}>
            {selectedSeats.length} seat{selectedSeats.length === 1 ? '' : 's'} selected
          </Text>
          <Text style={styles.totalValue}>₹{totalPrice}</Text>
        </View>

        <TouchableOpacity
          disabled={selectedSeats.length === 0 || saving}
          onPress={handleProceed}
          style={[
            styles.proceedButton,
            (selectedSeats.length === 0 || saving) && styles.proceedButtonDisabled,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons color="#fff" name="card" size={16} />
              <Text style={styles.proceedText}>Pay ₹{totalPrice}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Result Modal ── */}
      <ResultModal
        visible={resultModal.visible}
        success={resultModal.success}
        paymentId={resultModal.paymentId}
        bookingId={resultModal.bookingId}
        pnr={resultModal.pnr}
        errorMessage={resultModal.errorMessage}
        totalPrice={totalPrice}
        seats={selectedSeats}
        fromCity={fromCity}
        toCity={toCity}
        onClose={handleResultClose}
      />

      <PaymentDecisionModal
        visible={paymentChoiceVisible}
        totalPrice={totalPrice}
        seatCount={selectedSeats.length}
        onCancel={() => setPaymentChoiceVisible(false)}
        onFailure={handlePaymentChoiceFailure}
        onSuccess={handlePaymentChoiceSuccess}
      />
    </View>
  );
}

// ─── Seat generator ───────────────────────────────────────────────────────────

function generateSeats(prefix: string, count: number): Seat[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${prefix}${i + 1}` }));
}

// ─── Legend item ──────────────────────────────────────────────────────────────

function LegendItem({ label, style }: { label: string; style: object }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendBox, style]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

// ─── Result Modal ─────────────────────────────────────────────────────────────

type ResultModalProps = {
  visible: boolean;
  success: boolean;
  paymentId?: string;
  bookingId?: string;
  pnr?: string;
  errorMessage?: string;
  totalPrice: number;
  seats: string[];
  fromCity: string;
  toCity: string;
  onClose: () => void;
};

function ResultModal({
  visible,
  success,
  paymentId,
  bookingId,
  pnr,
  errorMessage,
  totalPrice,
  seats,
  fromCity,
  toCity,
  onClose,
}: ResultModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.card}>
          {/* Icon */}
          <View style={[rm.iconCircle, success ? rm.iconSuccess : rm.iconFailure]}>
            <Ionicons
              name={success ? 'checkmark' : 'close'}
              size={36}
              color="#fff"
            />
          </View>

          <Text style={rm.title}>
            {success ? 'Booking Confirmed!' : 'Payment Gateway Error'}
          </Text>
          <Text style={rm.subtitle}>
            {success
              ? `Your ${seats.length} seat(s) from ${fromCity} to ${toCity} are booked.`
              : (errorMessage ?? 'Could not load payment gateway. Check your internet connection.')}
          </Text>

          {success && (
            <View style={rm.detailsBox}>
              {pnr && (
                <View style={rm.detailRow}>
                  <Text style={rm.detailLabel}>PNR</Text>
                  <Text style={rm.detailValue}>{pnr}</Text>
                </View>
              )}
              {bookingId && (
                <View style={rm.detailRow}>
                  <Text style={rm.detailLabel}>Booking ID</Text>
                  <Text style={rm.detailValue}>{bookingId}</Text>
                </View>
              )}
              {paymentId && (
                <View style={rm.detailRow}>
                  <Text style={rm.detailLabel}>Payment ID</Text>
                  <Text style={[rm.detailValue, { fontSize: 11 }]}>{paymentId}</Text>
                </View>
              )}
              <View style={rm.detailRow}>
                <Text style={rm.detailLabel}>Amount Paid</Text>
                <Text style={[rm.detailValue, rm.amountText]}>₹{totalPrice}</Text>
              </View>
              <View style={rm.detailRow}>
                <Text style={rm.detailLabel}>Seats</Text>
                <Text style={rm.detailValue}>{seats.join(', ')}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={onClose}
            style={[rm.button, success ? rm.buttonSuccess : rm.buttonFailure]}
          >
            <Text style={rm.buttonText}>
              {success ? 'View My Bookings' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

type PaymentDecisionModalProps = {
  visible: boolean;
  totalPrice: number;
  seatCount: number;
  onSuccess: () => void;
  onFailure: () => void;
  onCancel: () => void;
};

function PaymentDecisionModal({
  visible,
  totalPrice,
  seatCount,
  onSuccess,
  onFailure,
  onCancel,
}: PaymentDecisionModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onCancel}>
      <View style={pm.overlay}>
        <View style={pm.card}>
          <Text style={pm.title}>Payment Simulation</Text>
          <Text style={pm.subtitle}>
            Select the payment result for {seatCount} seat{seatCount === 1 ? '' : 's'} (₹{totalPrice}).
          </Text>

          <View style={pm.actionsRow}>
            <TouchableOpacity style={pm.successBtn} onPress={onSuccess}>
              <Ionicons color="#fff" name="checkmark-circle" size={16} />
              <Text style={pm.actionText}>Success</Text>
            </TouchableOpacity>

            <TouchableOpacity style={pm.failureBtn} onPress={onFailure}>
              <Ionicons color="#fff" name="close-circle" size={16} />
              <Text style={pm.actionText}>Failure</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={pm.cancelBtn} onPress={onCancel}>
            <Text style={pm.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f3faf8',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4efe9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  refreshButton: {
    alignItems: 'center',
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe9e2',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  routeRow: {
    alignItems: 'center',
    backgroundColor: '#ebf8f2',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  routeText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    rowGap: 10,
  },
  metaItem: { width: '50%' },
  metaLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  metaValue: { color: '#0f172a', fontSize: 14, fontWeight: '700', marginTop: 2 },
  priceValue: { color: '#0ea663', fontSize: 14, fontWeight: '800', marginTop: 2 },
  legendCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe9e2',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  legendItem: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  legendBox: { borderColor: '#dbe9e2', borderRadius: 6, borderWidth: 1.5, height: 18, width: 18 },
  legendAvailable: { backgroundColor: '#e5e7eb', borderColor: '#b7bec8' },
  legendSelected: { backgroundColor: '#d1fae5', borderColor: '#22c55e' },
  legendBooked: { backgroundColor: '#ffe4e6', borderColor: '#fda4af' },
  legendLabel: { color: '#475467', fontSize: 12, fontWeight: '600' },
  deckCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe9e2',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  deckHeader: { alignItems: 'center', flexDirection: 'row', gap: 6, marginBottom: 10 },
  deckTitle: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  seatGrid: { gap: 0 },
  seatRow: { flexDirection: 'row', justifyContent: 'space-between' },
  seatRowSpaced: { marginTop: 8 },
  firstRowDivider: {
    borderTopColor: '#e9efeb',
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
  seat: {
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
    borderColor: '#b7bec8',
    borderRadius: 10,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    width: '15.5%',
  },
  seatSelected: { backgroundColor: '#d1fae5', borderColor: '#22c55e' },
  seatBooked: { backgroundColor: '#ffe4e6', borderColor: '#fda4af' },
  seatText: { color: '#6b7280', fontSize: 12, fontWeight: '700' },
  seatTextSelected: { color: '#15803d' },
  seatTextBooked: { color: '#be123c' },
  footer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopColor: '#dbe9e2',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  selectedCount: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  totalValue: { color: '#0ea663', fontSize: 20, fontWeight: '900', marginTop: 2 },
  proceedButton: {
    alignItems: 'center',
    backgroundColor: '#0ea663',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 140,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  proceedButtonDisabled: { opacity: 0.45 },
  proceedText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});

// Result Modal styles
const rm = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingBottom: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    width: '100%',
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: 20,
    width: 80,
  },
  iconSuccess: { backgroundColor: '#0ea663' },
  iconFailure: { backgroundColor: '#ef4444' },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#64748b', fontSize: 14, lineHeight: 20, marginBottom: 20, textAlign: 'center' },
  detailsBox: {
    backgroundColor: '#f3faf8',
    borderColor: '#dbe9e2',
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    padding: 14,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  detailLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  detailValue: { color: '#0f172a', fontSize: 13, fontWeight: '700', flexShrink: 1, marginLeft: 8, textAlign: 'right' },
  amountText: { color: '#0ea663', fontSize: 16, fontWeight: '900' },
  button: {
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 13,
    width: '100%',
    alignItems: 'center',
  },
  buttonSuccess: { backgroundColor: '#0ea663' },
  buttonFailure: { backgroundColor: '#ef4444' },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});

const pm = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    width: '100%',
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  successBtn: {
    alignItems: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  failureBtn: {
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    borderColor: '#dbe9e2',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '700',
  },
});
