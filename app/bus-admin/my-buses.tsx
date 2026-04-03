import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '@/src/firebase/firebaseConfig';
import { useAuth } from '@/src/context/AuthContext';
import { useCallback } from 'react';

interface Bus {
  id: string;
  adminName: string;
  adminUid: string;
  busName: string;
  busType: string;
  vehicleType: string;
  fromCity: string;
  toCity: string;
  startDate?: string;
  reachingDate?: string;
  departureTime: string;
  departureMeridiem?: 'AM' | 'PM';
  departureAM?: boolean;
  arrivalTime: string;
  arrivalMeridiem?: 'AM' | 'PM';
  arrivalAM?: boolean;
  price: number;
  duration: string;
  stops: string;
  totalSeats: number;
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

function formatBusTime(time: string, meridiem: 'AM' | 'PM' | ''): string {
  if (!time) {
    return '--';
  }

  return meridiem ? `${time} ${meridiem}` : time;
}

export default function MyBusesScreen() {
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isCompactHeader = width < 420;
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchBuses();
  }, [profile?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchBuses();
    }, [profile?.uid]),
  );

  const fetchBuses = async () => {
    if (!profile?.uid) return;
    try {
      setLoading(true);
      const q = query(collection(db, 'buses'), where('adminUid', '==', profile.uid));
      const snapshot = await getDocs(q);
      const busList: Bus[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Bus[];
      setBuses(busList);
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBus = async (busId: string) => {
    try {
      setDeleting(busId);
      await deleteDoc(doc(db, 'buses', busId));
      setBuses((prev) => prev.filter((bus) => bus.id !== busId));
    } catch (error) {
      console.error('Error deleting bus:', error);
      Alert.alert('Delete failed', 'Could not delete this bus. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const confirmDeleteBus = (busId: string) => {
    Alert.alert('Delete Bus', 'Are you sure you want to delete this bus?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          handleDeleteBus(busId);
        },
      },
    ]);
  };

  const renderBusCard = ({ item }: { item: Bus }) => (
    <View style={styles.busCard}>
      {(() => {
        const departureMeridiem = resolveMeridiem(item.departureMeridiem, item.departureAM);
        const arrivalMeridiem = resolveMeridiem(item.arrivalMeridiem, item.arrivalAM);

        return (
          <>
      <View style={styles.busHeader}>
        <View style={styles.busInfo}>
          <Text numberOfLines={1} style={styles.busName}>{item.busName}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.badgeText}>{item.busType}</Text>
            </View>
          </View>
          <Text numberOfLines={1} style={styles.vehicleType}>{item.vehicleType}</Text>
        </View>
        <View style={styles.actionButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => {
              router.push({
                pathname: '/bus-admin/edit-bus/[id]',
                params: { id: item.id },
              });
            }}
          >
            <Ionicons name="pencil" size={16} color="#0f766e" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnDanger,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => confirmDeleteBus(item.id)}
            disabled={deleting === item.id}
          >
            {deleting === item.id ? (
              <ActivityIndicator size={16} color="#dc2626" />
            ) : (
              <>
                <Ionicons name="trash" size={16} color="#dc2626" />
                <Text style={styles.actionBtnTextDanger}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.busDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>FROM</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{item.fromCity}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>TO</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{item.toCity}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>DEPARTURE</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{formatBusTime(item.departureTime, departureMeridiem)}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>ARRIVAL</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{formatBusTime(item.arrivalTime, arrivalMeridiem)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>PRICE</Text>
            <Text numberOfLines={1} style={styles.detailValue}>₹{item.price}/seat</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>DURATION</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{item.duration}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>STOPS</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{item.stops}</Text>
          </View>
          <View style={styles.detailCol}>
            <Text numberOfLines={1} style={styles.detailLabel}>SEATS</Text>
            <Text numberOfLines={1} style={styles.detailValue}>{item.totalSeats}</Text>
          </View>
        </View>

        {(item.startDate || item.reachingDate) ? (
          <View style={styles.detailRow}>
            <View style={styles.detailCol}>
              <Text numberOfLines={1} style={styles.detailLabel}>START DATE</Text>
              <Text numberOfLines={1} style={styles.detailValue}>{item.startDate || '--'}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text numberOfLines={1} style={styles.detailLabel}>REACHING DATE</Text>
              <Text numberOfLines={1} style={styles.detailValue}>{item.reachingDate || '--'}</Text>
            </View>
          </View>
        ) : null}
      </View>
          </>
        );
      })()}
    </View>
  );

  return (
    <View style={styles.page}>
      <View style={[styles.header, isCompactHeader && styles.headerCompact, { paddingTop: insets.top + 12 }]}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>My Buses</Text>
          <Text style={styles.subtitle}>Manage your registered bus fleet</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.registerBtn, isCompactHeader && styles.registerBtnCompact]}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => router.push('/bus-admin')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.registerBtnText}>Register New Bus</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0ea663" />
        </View>
      ) : buses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bus-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No buses registered yet</Text>
          <Text style={styles.emptyDesc}>Register your first bus to get started</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.emptyBtn}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => router.push('/bus-admin')}
          >
            <Text style={styles.emptyBtnText}>Register Bus</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={buses}
          renderItem={renderBusCard}
          keyExtractor={(item) => item.id}
          scrollEnabled
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    alignItems: 'center',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionBtnDanger: {
    borderColor: '#fecaca',
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionBtnText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnTextDanger: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badgeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  busCard: {
    backgroundColor: '#fff',
    borderColor: '#e5e7eb',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  busDetails: {
    marginTop: 14,
  },
  busHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  busInfo: {
    flex: 1,
  },
  busName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  centerContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  detailCol: {
    width: '48%',
  },
  detailLabel: {
    color: '#a0aec0',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    rowGap: 8,
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  emptyBtn: {
    backgroundColor: '#0ea663',
    borderRadius: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 6,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  headerCompact: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 10,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  page: {
    backgroundColor: '#f9fafb',
    flex: 1,
  },
  registerBtn: {
    alignItems: 'center',
    backgroundColor: '#0ea663',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  registerBtnCompact: {
    alignSelf: 'flex-start',
  },
  registerBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: '#667085',
    fontSize: 14,
    marginTop: 4,
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d1f7d1',
    borderColor: '#8ee6a2',
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehicleType: {
    color: '#667085',
    fontSize: 13,
    marginTop: 2,
  },
});
