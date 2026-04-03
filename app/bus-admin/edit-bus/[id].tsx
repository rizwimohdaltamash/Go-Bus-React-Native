import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '@/src/firebase/firebaseConfig';

interface BusData {
  busName: string;
  vehicleType: string;
  busType: string;
  fromCity: string;
  toCity: string;
  startDate: string;
  reachingDate: string;
  departureTime: string;
  arrivalTime: string;
  departureAM: boolean;
  arrivalAM: boolean;
  stops: string;
  price: number;
  totalSeats: number;
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

export default function EditBusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busData, setBusData] = useState<BusData>({
    busName: '',
    vehicleType: '',
    busType: '',
    fromCity: '',
    toCity: '',
    startDate: '',
    reachingDate: '',
    departureTime: '',
    arrivalTime: '',
    departureAM: true,
    arrivalAM: true,
    stops: '',
    price: 0,
    totalSeats: 0,
  });

  useEffect(() => {
    fetchBusData();
  }, [id]);

  const fetchBusData = async () => {
    if (!id) {
      setLoading(false);
      Alert.alert('Error', 'Invalid bus id. Please open the bus from My Buses again.');
      return;
    }
    try {
      setLoading(true);
      const docRef = doc(db, 'buses', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const departureAM =
          data.departureMeridiem === 'AM' ? true : data.departureMeridiem === 'PM' ? false : data.departureAM !== false;
        const arrivalAM =
          data.arrivalMeridiem === 'AM' ? true : data.arrivalMeridiem === 'PM' ? false : data.arrivalAM !== false;

        setBusData({
          busName: data.busName || '',
          vehicleType: data.vehicleType || '',
          busType: data.busType || '',
          fromCity: data.fromCity || '',
          toCity: data.toCity || '',
          startDate: data.startDate || '',
          reachingDate: data.reachingDate || '',
          departureTime: data.departureTime || '',
          arrivalTime: data.arrivalTime || '',
          departureAM,
          arrivalAM,
          stops: data.stops || '',
          price: data.price || 0,
          totalSeats: data.totalSeats || 0,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load bus details');
      console.error('Error fetching bus:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (
    departTimeStr: string,
    departAM: boolean,
    arrivalTimeStr: string,
    arrivalAM: boolean
  ): string => {
    if (!departTimeStr || !arrivalTimeStr) return '';

    const parseTime = (timeStr: string, isAM: boolean): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      let totalHours = hours;
      if (!isAM && hours !== 12) totalHours += 12;
      if (isAM && hours === 12) totalHours = 0;
      return totalHours * 60 + (minutes || 0);
    };

    const departMins = parseTime(departTimeStr, departAM);
    let arrivalMins = parseTime(arrivalTimeStr, arrivalAM);

    if (arrivalMins <= departMins) {
      arrivalMins += 24 * 60;
    }

    const diffMins = arrivalMins - departMins;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    if (mins === 0) return `${hours} hrs`;
    return `${hours} hrs ${mins} mins`;
  };

  const handleSave = async () => {
    if (
      !busData.busName ||
      !busData.fromCity ||
      !busData.toCity ||
      !busData.startDate ||
      !busData.reachingDate ||
      !busData.departureTime ||
      !busData.arrivalTime ||
      !busData.price ||
      !busData.totalSeats
    ) {
      Alert.alert('Validation', 'Please fill all required fields');
      return;
    }

    if (!isValidDate(busData.startDate) || !isValidDate(busData.reachingDate)) {
      Alert.alert('Validation', 'Please enter dates in YYYY-MM-DD format');
      return;
    }

    if (new Date(busData.reachingDate) < new Date(busData.startDate)) {
      Alert.alert('Validation', 'Reaching date cannot be before start date');
      return;
    }

    try {
      setSaving(true);
      const duration = calculateDuration(
        busData.departureTime,
        busData.departureAM,
        busData.arrivalTime,
        busData.arrivalAM
      );

      const docRef = doc(db, 'buses', id!);
      await updateDoc(docRef, {
        busName: busData.busName,
        vehicleType: busData.vehicleType,
        busType: busData.busType,
        fromCity: busData.fromCity,
        toCity: busData.toCity,
        startDate: busData.startDate,
        reachingDate: busData.reachingDate,
        departureTime: busData.departureTime,
        arrivalTime: busData.arrivalTime,
        departureAM: busData.departureAM,
        arrivalAM: busData.arrivalAM,
        departureMeridiem: busData.departureAM ? 'AM' : 'PM',
        arrivalMeridiem: busData.arrivalAM ? 'AM' : 'PM',
        duration,
        stops: busData.stops,
        price: Number(busData.price),
        totalSeats: Number(busData.totalSeats),
      });

      Alert.alert('Success', 'Bus updated successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update bus');
      console.error('Error updating bus:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.page, styles.centerContainer]}>
        <ActivityIndicator size="large" color="#0ea663" />
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Bus</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.formContainer,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Bus Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Driver1"
          value={busData.busName}
          onChangeText={(text) =>
            setBusData({ ...busData, busName: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>Vehicle Type *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Volvo"
          value={busData.vehicleType}
          onChangeText={(text) =>
            setBusData({ ...busData, vehicleType: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>Bus Type *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. AC Sleeper"
          value={busData.busType}
          onChangeText={(text) =>
            setBusData({ ...busData, busType: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>From City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mumbai"
          value={busData.fromCity}
          onChangeText={(text) =>
            setBusData({ ...busData, fromCity: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>To City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Bangalore"
          value={busData.toCity}
          onChangeText={(text) =>
            setBusData({ ...busData, toCity: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>Start Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={busData.startDate}
          onChangeText={(text) =>
            setBusData({ ...busData, startDate: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>Reaching Date *</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={busData.reachingDate}
          onChangeText={(text) =>
            setBusData({ ...busData, reachingDate: text })
          }
          editable={!saving}
        />

        <View style={styles.timeRow}>
          <View style={styles.timeCol}>
            <Text style={styles.label}>Departure Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              value={busData.departureTime}
              onChangeText={(text) =>
                setBusData({ ...busData, departureTime: text })
              }
              editable={!saving}
            />
            <View style={styles.ampmRow}>
              <Pressable
                style={[
                  styles.ampmBtn,
                  busData.departureAM && styles.ampmBtnActive,
                ]}
                onPress={() =>
                  setBusData({ ...busData, departureAM: true })
                }
              >
                <Text
                  style={[
                    styles.ampmText,
                    busData.departureAM && styles.ampmTextActive,
                  ]}
                >
                  AM
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ampmBtn,
                  !busData.departureAM && styles.ampmBtnActive,
                ]}
                onPress={() =>
                  setBusData({ ...busData, departureAM: false })
                }
              >
                <Text
                  style={[
                    styles.ampmText,
                    !busData.departureAM && styles.ampmTextActive,
                  ]}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.timeCol}>
            <Text style={styles.label}>Arrival Time *</Text>
            <TextInput
              style={styles.input}
              placeholder="HH:MM"
              value={busData.arrivalTime}
              onChangeText={(text) =>
                setBusData({ ...busData, arrivalTime: text })
              }
              editable={!saving}
            />
            <View style={styles.ampmRow}>
              <Pressable
                style={[
                  styles.ampmBtn,
                  busData.arrivalAM && styles.ampmBtnActive,
                ]}
                onPress={() =>
                  setBusData({ ...busData, arrivalAM: true })
                }
              >
                <Text
                  style={[
                    styles.ampmText,
                    busData.arrivalAM && styles.ampmTextActive,
                  ]}
                >
                  AM
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.ampmBtn,
                  !busData.arrivalAM && styles.ampmBtnActive,
                ]}
                onPress={() =>
                  setBusData({ ...busData, arrivalAM: false })
                }
              >
                <Text
                  style={[
                    styles.ampmText,
                    !busData.arrivalAM && styles.ampmTextActive,
                  ]}
                >
                  PM
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <Text style={styles.label}>Stops</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Anand Rao Circle"
          value={busData.stops}
          onChangeText={(text) =>
            setBusData({ ...busData, stops: text })
          }
          editable={!saving}
        />

        <Text style={styles.label}>Price per Seat (INR) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 900"
          value={busData.price.toString()}
          onChangeText={(text) =>
            setBusData({ ...busData, price: Number(text) || 0 })
          }
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <Text style={styles.label}>Total Seats *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 36"
          value={busData.totalSeats.toString()}
          onChangeText={(text) =>
            setBusData({ ...busData, totalSeats: Number(text) || 0 })
          }
          keyboardType="decimal-pad"
          editable={!saving}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.saveBtn,
            (saving || !busData.busName) && styles.saveBtnDisabled,
            styles.inlineSaveBtn,
          ]}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={handleSave}
          disabled={saving || !busData.busName}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Update Bus</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.saveBtn,
            (saving || !busData.busName) && styles.saveBtnDisabled,
          ]}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={handleSave}
          disabled={saving || !busData.busName}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>Update Bus</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ampmBtn: {
    borderColor: '#e5e7eb',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ampmBtnActive: {
    backgroundColor: '#0ea663',
    borderColor: '#0ea663',
  },
  ampmRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  ampmText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  ampmTextActive: {
    color: '#fff',
  },
  backBtn: {
    padding: 8,
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    backgroundColor: '#fff',
    borderTopColor: '#e5e7eb',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 14,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineSaveBtn: {
    marginBottom: 12,
    marginTop: 4,
  },
  label: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  page: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#0ea663',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveBtnDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timeCol: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
