import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/firebase/firebase';

type Meridiem = 'AM' | 'PM';
type BusType = 'AC Sleeper' | 'AC Seater' | 'Non-AC Sleeper' | 'Non-AC Seater';

type FormState = {
  busName: string;
  vehicleType: string;
  busType: BusType;
  fromCity: string;
  toCity: string;
  startDate: string;
  reachingDate: string;
  departureTime: string;
  departureMeridiem: Meridiem;
  arrivalTime: string;
  arrivalMeridiem: Meridiem;
  stops: string;
  pricePerSeat: string;
  totalSeats: string;
};

const BUS_TYPES: BusType[] = ['AC Sleeper', 'AC Seater', 'Non-AC Sleeper', 'Non-AC Seater'];

const defaultForm: FormState = {
  busName: '',
  vehicleType: '',
  busType: 'AC Sleeper',
  fromCity: '',
  toCity: '',
  startDate: '',
  reachingDate: '',
  departureTime: '',
  departureMeridiem: 'AM',
  arrivalTime: '',
  arrivalMeridiem: 'AM',
  stops: '',
  pricePerSeat: '',
  totalSeats: '',
};

function formatTimeInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 4);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function formatDateInput(value: string) {
  const digits = value.replace(/[^0-9]/g, '').slice(0, 8);

  if (digits.length <= 4) {
    return digits;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

function isValidDate(dateValue: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toMinutes(time12h: string, meridiem: Meridiem): number | null {
  const match = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(time12h);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 1 || hour > 12) {
    return null;
  }

  if (meridiem === 'AM') {
    if (hour === 12) {
      hour = 0;
    }
  } else if (hour !== 12) {
    hour += 12;
  }

  return hour * 60 + minute;
}

function durationText(
  departureTime: string,
  departureMeridiem: Meridiem,
  arrivalTime: string,
  arrivalMeridiem: Meridiem,
) {
  const departure = toMinutes(departureTime, departureMeridiem);
  const arrival = toMinutes(arrivalTime, arrivalMeridiem);

  if (departure === null || arrival === null) {
    return '';
  }

  let diff = arrival - departure;

  if (diff <= 0) {
    diff += 24 * 60;
  }

  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (minutes === 0) {
    return `${hours} hrs`;
  }

  return `${hours} hrs ${minutes} mins`;
}

export default function BusAdminIndexScreen() {
  const { width } = useWindowDimensions();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  const isWide = width >= 820;

  const computedDuration = useMemo(
    () => durationText(form.departureTime, form.departureMeridiem, form.arrivalTime, form.arrivalMeridiem),
    [form.arrivalMeridiem, form.arrivalTime, form.departureMeridiem, form.departureTime],
  );

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async () => {
    if (!profile?.uid) {
      Alert.alert('Profile unavailable', 'Please wait for profile to load and try again.');
      return;
    }

    const requiredChecks: Array<[string, string]> = [
      ['Bus Name / Operator', form.busName],
      ['Vehicle Type', form.vehicleType],
      ['From City', form.fromCity],
      ['To City', form.toCity],
      ['Start Date', form.startDate],
      ['Reaching Date', form.reachingDate],
      ['Departure Time', form.departureTime],
      ['Arrival Time', form.arrivalTime],
      ['Price per Seat', form.pricePerSeat],
      ['Total Seats', form.totalSeats],
    ];

    const missing = requiredChecks.find(([, value]) => value.trim().length === 0);

    if (missing) {
      Alert.alert('Missing field', `Please enter ${missing[0]}.`);
      return;
    }

    const departureMinutes = toMinutes(form.departureTime, form.departureMeridiem);
    const arrivalMinutes = toMinutes(form.arrivalTime, form.arrivalMeridiem);

    if (departureMinutes === null || arrivalMinutes === null) {
      Alert.alert('Invalid time', 'Please enter valid departure and arrival times in HH:MM format.');
      return;
    }

    if (!isValidDate(form.startDate) || !isValidDate(form.reachingDate)) {
      Alert.alert('Invalid date', 'Please enter dates in YYYY-MM-DD format.');
      return;
    }

    if (new Date(form.reachingDate) < new Date(form.startDate)) {
      Alert.alert('Invalid dates', 'Reaching date cannot be before start date.');
      return;
    }

    const price = Number(form.pricePerSeat);
    const seats = Number(form.totalSeats);

    if (!Number.isFinite(price) || price <= 0) {
      Alert.alert('Invalid fare', 'Price per seat must be a positive number.');
      return;
    }

    if (!Number.isInteger(seats) || seats <= 0) {
      Alert.alert('Invalid seats', 'Total seats must be a positive whole number.');
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, 'buses'), {
        adminName: profile?.name ?? 'Bus Admin',
        adminUid: profile.uid,
        arrivalTime: form.arrivalTime,
        arrivalMeridiem: form.arrivalMeridiem,
        arrivalAM: form.arrivalMeridiem === 'AM',
        busName: form.busName.trim(),
        busType: form.busType,
        createdAt: new Date().toISOString(),
        departureTime: form.departureTime,
        departureMeridiem: form.departureMeridiem,
        departureAM: form.departureMeridiem === 'AM',
        duration: computedDuration,
        fromCity: form.fromCity.trim(),
        price,
        startDate: form.startDate,
        reachingDate: form.reachingDate,
        stops: form.stops.trim(),
        toCity: form.toCity.trim(),
        totalSeats: seats,
        vehicleType: form.vehicleType.trim(),
      });

      setForm(defaultForm);
      Alert.alert('Bus registered', 'Your bus has been added successfully.');
    } catch {
      Alert.alert('Failed', 'Could not register the bus. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Register Bus</Text>
        <Text style={styles.subtitle}>Publish your bus route for passengers to book seats</Text>

        <View style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <Ionicons color="#0f8d59" name="bus-outline" size={18} />
            <Text style={styles.sectionTitle}>Bus Details</Text>
          </View>

          <LabeledInput
            label="Bus Name / Operator"
            required
            placeholder="e.g. GoBus Express"
            value={form.busName}
            onChangeText={(value) => setField('busName', value)}
          />

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <LabeledInput
                label="Vehicle Type"
                required
                placeholder="e.g. Volvo Multi-Axle"
                value={form.vehicleType}
                onChangeText={(value) => setField('vehicleType', value)}
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Bus Type</Text>
              <View style={styles.typeWrap}>
                {BUS_TYPES.map((type) => {
                  const active = form.busType === type;
                  return (
                    <Pressable
                      key={type}
                      onPress={() => setField('busType', type)}
                      style={[styles.typeChip, active && styles.typeChipActive]}
                    >
                      <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{type}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <LabeledInput
                label="From City"
                required
                placeholder="e.g. Mumbai"
                value={form.fromCity}
                onChangeText={(value) => setField('fromCity', value)}
              />
            </View>
            <View style={styles.col}>
              <LabeledInput
                label="To City"
                required
                placeholder="e.g. Pune"
                value={form.toCity}
                onChangeText={(value) => setField('toCity', value)}
              />
            </View>
          </View>

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <LabeledInput
                label="Start Date"
                required
                placeholder="YYYY-MM-DD"
                value={form.startDate}
                onChangeText={(value) => setField('startDate', formatDateInput(value))}
              />
            </View>
            <View style={styles.col}>
              <LabeledInput
                label="Reaching Date"
                required
                placeholder="YYYY-MM-DD"
                value={form.reachingDate}
                onChangeText={(value) => setField('reachingDate', formatDateInput(value))}
              />
            </View>
          </View>

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <Text style={styles.label}>Departure Time *</Text>
              <View style={styles.timeRow}>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(value) => setField('departureTime', formatTimeInput(value))}
                  placeholder="hh:mm"
                  placeholderTextColor="#9aa4b2"
                  style={[styles.input, styles.timeInput]}
                  value={form.departureTime}
                />
                <MeridiemToggle value={form.departureMeridiem} onChange={(value) => setField('departureMeridiem', value)} />
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Arrival Time *</Text>
              <View style={styles.timeRow}>
                <TextInput
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={(value) => setField('arrivalTime', formatTimeInput(value))}
                  placeholder="hh:mm"
                  placeholderTextColor="#9aa4b2"
                  style={[styles.input, styles.timeInput]}
                  value={form.arrivalTime}
                />
                <MeridiemToggle value={form.arrivalMeridiem} onChange={(value) => setField('arrivalMeridiem', value)} />
              </View>
            </View>
          </View>

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <LabeledInput label="Duration" placeholder="--" value={computedDuration || '--'} editable={false} />
            </View>
            <View style={styles.col}>
              <LabeledInput
                label="Stops"
                placeholder="e.g. Lonavala, Khandala"
                value={form.stops}
                onChangeText={(value) => setField('stops', value)}
              />
            </View>
          </View>

          <View style={[styles.row, !isWide && styles.rowStack]}>
            <View style={styles.col}>
              <LabeledInput
                label="Price per Seat (INR)"
                required
                keyboardType="numeric"
                placeholder="e.g. 850"
                value={form.pricePerSeat}
                onChangeText={(value) => setField('pricePerSeat', value.replace(/[^0-9]/g, ''))}
              />
            </View>
            <View style={styles.col}>
              <LabeledInput
                label="Total Seats"
                required
                keyboardType="numeric"
                placeholder="e.g. 36"
                value={form.totalSeats}
                onChangeText={(value) => setField('totalSeats', value.replace(/[^0-9]/g, ''))}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={submitting}
          onPress={onSubmit}
          style={[styles.submitBtn, submitting && styles.submitDisabled]}
        >
          <Ionicons color="#ffffff" name="add-circle-outline" size={20} />
          <Text style={styles.submitText}>{submitting ? 'Registering...' : 'Register Bus'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

type LabeledInputProps = {
  label: string;
  placeholder: string;
  value: string;
  required?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'numeric' | 'number-pad';
  onChangeText?: (value: string) => void;
};

function LabeledInput({
  label,
  placeholder,
  value,
  required,
  editable = true,
  keyboardType,
  onChangeText,
}: LabeledInputProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa4b2"
        style={[styles.input, !editable && styles.inputReadOnly]}
        value={value}
      />
    </View>
  );
}

type MeridiemToggleProps = {
  value: Meridiem;
  onChange: (value: Meridiem) => void;
};

function MeridiemToggle({ value, onChange }: MeridiemToggleProps) {
  return (
    <View style={styles.meridiemWrap}>
      {(['AM', 'PM'] as const).map((item) => {
        const active = value === item;

        return (
          <Pressable key={item} onPress={() => onChange(item)} style={[styles.meridiemBtn, active && styles.meridiemBtnActive]}>
            <Text style={[styles.meridiemText, active && styles.meridiemTextActive]}>{item}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    paddingHorizontal: 16,
  },
  fieldWrap: {
    marginTop: 12,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde5ef',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#d5dce6',
    borderRadius: 10,
    borderWidth: 1,
    color: '#1e293b',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  inputReadOnly: {
    backgroundColor: '#f1f5f9',
    color: '#0f766e',
    fontWeight: '700',
  },
  label: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  meridiemBtn: {
    alignItems: 'center',
    borderColor: '#cdd6e1',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  meridiemBtnActive: {
    backgroundColor: '#dff7ea',
    borderColor: '#10b981',
  },
  meridiemText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  meridiemTextActive: {
    color: '#047857',
  },
  meridiemWrap: {
    flexDirection: 'row',
    gap: 6,
    width: 100,
  },
  page: {
    backgroundColor: '#eef7f3',
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowStack: {
    flexDirection: 'column',
    gap: 0,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: '#059669',
    borderColor: '#047857',
    borderRadius: 12,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    minHeight: 54,
    paddingHorizontal: 20,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  timeInput: {
    flex: 1,
  },
  timeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
  },
  typeChip: {
    backgroundColor: '#f8fafc',
    borderColor: '#d5dce6',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  typeChipActive: {
    backgroundColor: '#e4f8ee',
    borderColor: '#10b981',
  },
  typeChipText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#047857',
    fontWeight: '700',
  },
  typeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
});
