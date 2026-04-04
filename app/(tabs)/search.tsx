import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/src/firebase/firebase';
import { fetchBookedSeatIds } from '@/src/utils/bookingUtils';

const MAJOR_CITIES = [
  'Mumbai', 'Pune', 'Bangalore', 'Chennai', 'Delhi', 'Hyderabad',
  'Kolkata', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Indore', 'Surat',
  'Vadodara', 'Nagpur', 'Kochi', 'Thrissur', 'Mysore', 'Visakhapatnam',
  'Goa', 'Aurangabad',
];

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

function formatDateToYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateValue: string): string {
  const parsedDate = parseDateString(dateValue);

  if (!parsedDate) {
    return dateValue;
  }

  return parsedDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateChipLabel(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function parseDateString(dateValue?: unknown): Date | null {
  const text = String(dateValue ?? '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isDateWithinRange(target: Date, rangeStart?: unknown, rangeEnd?: unknown): boolean {
  const start = parseDateString(rangeStart);
  const end = parseDateString(rangeEnd);

  if (!start || !end) {
    return false;
  }

  const targetTime = target.getTime();
  return targetTime >= start.getTime() && targetTime <= end.getTime();
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
    const router = useRouter();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [journeyDate, setJourneyDate] = useState('');
  const [pickerDate, setPickerDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);
  const [allBuses, setAllBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all buses on mount
  useEffect(() => {
    loadAllBuses();
  }, []);

  const loadAllBuses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'buses'));
      const buses = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // For each bus, fetch already-booked seatIds from confirmed bookings
      const busesWithBookedSeats = await Promise.all(
        buses.map(async (bus: any) => {
          const bookedSeats = await fetchBookedSeatIds(bus.id);
          return { ...bus, bookedSeats };
        })
      );

      setAllBuses(busesWithBookedSeats);
    } catch (error) {
      console.error('Error loading buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFromCities = useMemo(() => {
    if (!fromCity || activeInput !== 'from') return [];
    return MAJOR_CITIES.filter(city =>
      city.toLowerCase().startsWith(fromCity.toLowerCase())
    ).slice(0, 6);
  }, [fromCity, activeInput]);

  const filteredToCities = useMemo(() => {
    if (!toCity || activeInput !== 'to') return [];
    return MAJOR_CITIES.filter(city =>
      city.toLowerCase().startsWith(toCity.toLowerCase()) && city !== fromCity
    ).slice(0, 6);
  }, [toCity, activeInput, fromCity]);

  const upcomingDates = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Array.from({ length: 60 }, (_, index) => {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + index);
      return nextDate;
    });
  }, []);

  // Filter buses based on selected cities
  const filteredBuses = useMemo(() => {
    let results = allBuses;
    const selectedDate = parseDateString(journeyDate);
    
    if (fromCity.trim()) {
      results = results.filter(bus => 
        bus.fromCity.toLowerCase() === fromCity.toLowerCase()
      );
    }
    
    if (toCity.trim()) {
      results = results.filter(bus => 
        bus.toCity.toLowerCase() === toCity.toLowerCase()
      );
    }

    if (journeyDate.trim()) {
      if (!selectedDate) {
        return [];
      }

      results = results.filter((bus: any) =>
        isDateWithinRange(selectedDate, bus.startDate, bus.reachingDate)
      );
    }
    
    return results;
  }, [allBuses, fromCity, toCity, journeyDate]);

  const handleSelectFromCity = (city: string) => {
    setFromCity(city);
    setActiveInput(null);
  };

  const handleSelectToCity = (city: string) => {
    setToCity(city);
    setActiveInput(null);
  };

  const handleOpenDatePicker = () => {
    Haptics.selectionAsync();
    setActiveInput(null);

    const parsedDate = parseDateString(journeyDate);
    if (parsedDate) {
      setPickerDate(parsedDate);
    }

    setShowDatePicker(true);
  };

  const handleSelectDate = (selectedDate: Date) => {
    setPickerDate(selectedDate);
    setJourneyDate(formatDateToYmd(selectedDate));
    setShowDatePicker(false);
  };

  const renderBusCard = ({ item }: any) => (
    <View style={styles.busCard}>
      {(() => {
        const departureDisplayTime = formatBusTime(item.departureTime, item.departureMeridiem, item.departureAM);
        const arrivalDisplayTime = formatBusTime(item.arrivalTime, item.arrivalMeridiem, item.arrivalAM);
        const availabilityText =
          item.startDate && item.reachingDate
            ? `${item.startDate} to ${item.reachingDate}`
            : 'Date not provided';

        return (
          <>
      <View style={styles.busCardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.busName}>{item.busName}</Text>
          <Text style={styles.busDriver}>{item.busType} • {item.vehicleType}</Text>
        </View>
        <View style={styles.priceChip}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>₹{item.price}</Text>
        </View>
      </View>
      
      {/* Route Info */}
      <View style={styles.routePath}>
        <Text style={styles.routePathText}>{item.fromCity}</Text>
        <Ionicons name="arrow-forward" size={16} color="#0ea663" style={{ marginHorizontal: 8 }} />
        <Text style={styles.routePathText}>{item.toCity}</Text>
      </View>
      
      <View style={styles.busRoute}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeTime}>{departureDisplayTime}</Text>
          <Text style={styles.routeLabel}>Departure</Text>
        </View>
        <View style={styles.routeArrow}>
          <Text style={styles.arrow}>→</Text>
        </View>
        <View style={styles.routeInfo}>
          <Text style={styles.routeTime}>{arrivalDisplayTime}</Text>
          <Text style={styles.routeLabel}>Arrival</Text>
        </View>
      </View>

      <View style={styles.busDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>{item.duration}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Seats</Text>
          <Text style={styles.detailValue}>{item.totalSeats} left</Text>
        </View>
      </View>

      <View style={styles.dateChip}>
        <Ionicons name="calendar-outline" size={14} color="#0ea663" />
        <Text style={styles.dateChipText}>Available: {availabilityText}</Text>
      </View>

      {/* Select & Continue CTA */}
      <TouchableOpacity
        activeOpacity={0.84}
        style={styles.selectButton}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push({
            pathname: '/seat-selection',
            params: {
              bus: JSON.stringify(item),
              journeyDate: journeyDate || String(item.startDate || ''),
            }
          });
        }}
      >
        <Text style={styles.selectButtonText}>Select & Continue</Text>
        <Ionicons color="#0f172a" name="arrow-forward-circle" size={22} />
      </TouchableOpacity>
          </>
        );
      })()}
    </View>
  );

  return (
    <ScrollView style={[styles.page, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Search Buses</Text>
      <Text style={styles.subtitle}>Find the perfect bus for your trip</Text>

      {/* Search Form Card */}
      <View style={styles.searchCard}>
        {/* From City */}
        <View style={styles.fromToSection}>
          <Text style={styles.fieldLabel}>From</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={18} color="#98a2b3" />
            <TextInput
              style={styles.input}
              placeholder="Departure City"
              placeholderTextColor="#d0d5dd"
              value={fromCity}
              onChangeText={setFromCity}
              onFocus={() => setActiveInput('from')}
              editable={!loading}
            />
            {fromCity ? (
              <TouchableOpacity onPress={() => setFromCity('')}>
                <Ionicons name="close-circle" size={18} color="#98a2b3" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* From City Suggestions */}
          {filteredFromCities.length > 0 && (
            <View style={styles.suggestionsDropdown}>
              {filteredFromCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectFromCity(city)}
                >
                  <Ionicons name="location" size={14} color="#0ea663" />
                  <Text style={styles.suggestionText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* To City */}
        <View style={styles.fromToSection}>
          <Text style={styles.fieldLabel}>To</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="location" size={18} color="#98a2b3" />
            <TextInput
              style={styles.input}
              placeholder="Arrival City"
              placeholderTextColor="#d0d5dd"
              value={toCity}
              onChangeText={setToCity}
              onFocus={() => setActiveInput('to')}
              editable={!loading}
            />
            {toCity ? (
              <TouchableOpacity onPress={() => setToCity('')}>
                <Ionicons name="close-circle" size={18} color="#98a2b3" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* To City Suggestions */}
          {filteredToCities.length > 0 && (
            <View style={styles.suggestionsDropdown}>
              {filteredToCities.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectToCity(city)}
                >
                  <Ionicons name="location" size={14} color="#0ea663" />
                  <Text style={styles.suggestionText}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.fromToSection}>
          <Text style={styles.fieldLabel}>Journey Date</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenDatePicker}
            style={styles.inputWrapper}
            disabled={loading}
          >
            <Ionicons name="calendar-outline" size={18} color="#98a2b3" />
            <Text style={[styles.input, !journeyDate && styles.datePlaceholder]}>
              {journeyDate ? formatDateForDisplay(journeyDate) : 'Select journey date'}
            </Text>
            {journeyDate ? (
              <TouchableOpacity onPress={() => setJourneyDate('')}>
                <Ionicons name="close-circle" size={18} color="#98a2b3" />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateChipsRow}
              >
                {upcomingDates.map((dateItem) => {
                  const value = formatDateToYmd(dateItem);
                  const isSelected = value === journeyDate;

                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.dateChipButton, isSelected && styles.dateChipButtonSelected]}
                      onPress={() => handleSelectDate(dateItem)}
                    >
                      <Text style={[styles.dateChipLabel, isSelected && styles.dateChipLabelSelected]}>
                        {formatDateChipLabel(dateItem)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity
                style={styles.dateDoneButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.dateDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
          onPress={loadAllBuses}
          disabled={loading}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.searchButtonText}>Search Available Buses</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Available Routes Section */}
      {!loading && filteredBuses.length > 0 && (
        <View style={styles.routesSection}>
          <View style={styles.routesSectionHeader}>
            <Ionicons name="layers" size={20} color="#0ea663" />
            <Text style={styles.routesSectionTitle}>Available Routes</Text>
          </View>
          <FlatList
            data={filteredBuses}
            renderItem={renderBusCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Empty State */}
      {!loading && (fromCity || toCity) && filteredBuses.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="bus" size={48} color="#dbe9e2" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyStateTitle}>No buses found</Text>
          <Text style={styles.emptyStateSubtitle}>
            Try adjusting your search criteria, city, or date
          </Text>
        </View>
      )}

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#0ea663" />
          <Text style={styles.loadingText}>Loading buses...</Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f3faf8',
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    marginBottom: 24,
  },
  
  // Search Card Styles
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 24,
  },
  fromToSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#dbe9e2',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f8fdfb',
  },
  input: {
    flex: 1,
    marginHorizontal: 8,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '500',
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderColor: '#dbe9e2',
    borderWidth: 1,
    maxHeight: 180,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomColor: '#eff0f3',
    borderBottomWidth: 1,
  },
  suggestionText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  datePlaceholder: {
    color: '#d0d5dd',
  },
  datePickerWrap: {
    marginTop: 10,
    borderColor: '#dbe9e2',
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dateChipsRow: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    gap: 8,
  },
  dateChipButton: {
    borderColor: '#dbe9e2',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8fdfb',
  },
  dateChipButtonSelected: {
    backgroundColor: '#0ea663',
    borderColor: '#0ea663',
  },
  dateChipLabel: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  dateChipLabelSelected: {
    color: '#ffffff',
  },
  dateDoneButton: {
    borderTopColor: '#eff0f3',
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateDoneButtonText: {
    color: '#0ea663',
    fontSize: 15,
    fontWeight: '700',
  },
  
  // Search Button Styles
  searchButton: {
    backgroundColor: '#0ea663',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Routes Section
  routesSection: {
    marginBottom: 24,
  },
  routesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  routesSectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Bus Card Styles
  busCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderColor: '#c8e6d5',
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0ea663',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  busCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  busName: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  busDriver: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
  },
  priceChip: {
    backgroundColor: '#f0fdf4',
    borderColor: '#dbe9e2',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  priceLabel: {
    color: '#0ea663',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  priceValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  routePath: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#f3faf8',
    borderRadius: 8,
    marginBottom: 12,
  },
  routePathText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  busRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopColor: '#eff0f3',
    borderTopWidth: 1,
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
    alignItems: 'center',
  },
  routeTime: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  routeLabel: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '500',
  },
  routeArrow: {
    marginHorizontal: 8,
  },
  arrow: {
    color: '#dbe9e2',
    fontSize: 16,
  },
  busDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopColor: '#eff0f3',
    borderTopWidth: 1,
    borderBottomColor: '#eff0f3',
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  detailDivider: {
    width: 1,
    backgroundColor: '#eff0f3',
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: '#f3faf8',
    borderColor: '#dbe9e2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dateChipText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '600',
  },
  // --- Select & Continue button ---
  selectButton: {
    backgroundColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  selectButtonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Loading State
  loadingState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});