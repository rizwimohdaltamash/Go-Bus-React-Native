import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BookingScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.page, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Bookings</Text>
      <Text style={styles.subtitle}>Top routes, offers, and quick booking options.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming next</Text>
        <Text style={styles.cardBody}>Popular routes and offers module will be connected here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f3faf8',
    flex: 1,
    paddingHorizontal: 20,
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
  card: {
    backgroundColor: '#fff',
    borderColor: '#e4e7ec',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 16,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardBody: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
  },
});
