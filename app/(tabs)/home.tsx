import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';

function triggerHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(style);
  }
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  // Show only the first word of the name (e.g. "Altamash" from "Altamash Rizwi")
  const firstName = profile?.name?.trim().split(/\s+/)[0] ?? 'User';

  return (
    <View style={styles.page}>
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />

      <ScrollView
        style={{ paddingTop: insets.top + 8 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
          paddingHorizontal: 18,
          paddingTop: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={styles.logoWrap}>
            <FontAwesome6 color="#12a665" name="bus" size={18} />
          </View>
          <View>
            <Text style={styles.brandTitle}>Go-Bus</Text>
            <Text style={styles.brandSubtitle}>India's smart bus ticketing app</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          {/* WELCOME BACK pill */}
          <View style={styles.greetingPill}>
            <Ionicons color="#0f8d59" name="sparkles" size={13} />
            <Text style={styles.greetingPillText}>WELCOME BACK</Text>
          </View>

          {/* Hi, Name — with left green accent bar */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingAccent} />
            <Text style={styles.heroGreeting}>
              <Text style={styles.heroGreetingHi}>Hi, </Text>
              <Text style={styles.heroGreetingName}>{firstName}</Text>
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.heroDivider} />

          <Text style={styles.heroHeadline}>Book smarter, travel easier.</Text>
          <Text style={styles.heroText}>
            Find trusted buses, compare fares, and manage your trips without stress.
          </Text>

          <View style={styles.badgeRow}>
            <View style={styles.badgePill}>
              <Ionicons color="#0f8d59" name="shield-checkmark-outline" size={14} />
              <Text style={styles.badgeText}>Verified Operators</Text>
            </View>
            <View style={styles.badgePill}>
              <Ionicons color="#0f8d59" name="time-outline" size={14} />
              <Text style={styles.badgeText}>Instant Booking</Text>
            </View>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.86}
            onPressIn={() => triggerHaptic(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/search');
            }}
            style={styles.primaryButton}
          >
            <Ionicons color="#ffffff" name="search" size={18} />
            <Text style={styles.primaryButtonText}>Search Buses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.86}
            onPressIn={() => triggerHaptic(Haptics.ImpactFeedbackStyle.Light)}
            onPress={() => {
              triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/my-bookings');
            }}
            style={styles.secondaryButton}
          >
            <Ionicons color="#155e3b" name="ticket-outline" size={18} />
            <Text style={styles.secondaryButtonText}>My Bookings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons color="#0ea663" name="business-outline" size={22} />
              <Text style={styles.statValue}>500+</Text>
              <Text style={styles.statLabel}>Cities Covered</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons color="#0ea663" name="people-outline" size={22} />
              <Text style={styles.statValue}>10K+</Text>
              <Text style={styles.statLabel}>Happy Travelers</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons color="#0ea663" name="headset-outline" size={22} />
              <Text style={styles.statValue}>24/7</Text>
              <Text style={styles.statLabel}>Support Available</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons color="#0ea663" name="cash-outline" size={22} />
              <Text style={styles.statValue}>₹999</Text>
              <Text style={styles.statLabel}>Starting Price</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Why travelers choose Go-Bus</Text>
          <View style={styles.pointRow}>
            <Ionicons color="#10b981" name="checkmark-circle" size={16} />
            <Text style={styles.pointText}>Live seat availability with fair prices</Text>
          </View>
          <View style={styles.pointRow}>
            <Ionicons color="#10b981" name="checkmark-circle" size={16} />
            <Text style={styles.pointText}>Fast checkout and simple bookings</Text>
          </View>
          <View style={styles.pointRow}>
            <Ionicons color="#10b981" name="checkmark-circle" size={16} />
            <Text style={styles.pointText}>Easy booking history and trip tracking</Text>
          </View>
        </View>

        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons color="#0ea663" name="flash-outline" size={18} />
            </View>
            <Text style={styles.featureTitle}>Instant Booking</Text>
            <Text style={styles.featureText}>
              Book your bus in under 60 seconds with smooth and fast flow.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons color="#0ea663" name="shield-checkmark-outline" size={18} />
            </View>
            <Text style={styles.featureTitle}>Secure Payments</Text>
            <Text style={styles.featureText}>
              Protected checkout with trusted transactions for every booking.
            </Text>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons color="#0ea663" name="albums-outline" size={18} />
            </View>
            <Text style={styles.featureTitle}>Seat Selection</Text>
            <Text style={styles.featureText}>
              Choose preferred seats quickly and keep trip details in one place.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  badgePill: {
    alignItems: 'center',
    backgroundColor: '#eaf9f0',
    borderColor: '#c7ebd6',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  badgeText: {
    color: '#0f8d59',
    fontSize: 12,
    fontWeight: '700',
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  brandSubtitle: {
    color: '#5f7e72',
    fontSize: 12,
    marginTop: 1,
  },
  brandTitle: {
    color: '#0f8d59',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.2,
    lineHeight: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe9e2',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
  },
  featureIconWrap: {
    alignItems: 'center',
    backgroundColor: '#e9f8ef',
    borderRadius: 14,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  featureText: {
    color: '#5b6b7e',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  featureTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  featuresGrid: {
    marginTop: 6,
  },
  glowBottom: {
    backgroundColor: '#d8eee4',
    borderRadius: 220,
    bottom: -140,
    height: 280,
    left: -120,
    opacity: 0.5,
    position: 'absolute',
    width: 280,
  },
  glowTop: {
    backgroundColor: '#d7f4e7',
    borderRadius: 220,
    height: 280,
    opacity: 0.48,
    position: 'absolute',
    right: -130,
    top: -130,
    width: 280,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderColor: '#c8e6d5',
    borderRadius: 22,
    borderWidth: 1.5,
    elevation: 5,
    padding: 18,
    shadowColor: '#0ea663',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  greetingPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e6f9ef',
    borderColor: '#abe8c5',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    marginBottom: 10,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  greetingPillText: {
    color: '#0a7a4e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  greetingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  greetingAccent: {
    backgroundColor: '#0ea663',
    borderRadius: 4,
    height: 40,
    width: 5,
  },
  heroDivider: {
    backgroundColor: '#e5f3eb',
    height: 1,
    marginBottom: 12,
  },
  heroGreeting: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  heroGreetingHi: {
    color: '#0ea663',
  },
  heroGreetingName: {
    color: '#0f172a',
  },
  heroHeadline: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 28,
    marginBottom: 6,
  },
  heroText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 2,
  },
  logoWrap: {
    alignItems: 'center',
    backgroundColor: '#e8f8ef',
    borderColor: '#bde8cf',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  page: {
    backgroundColor: '#f0f6f3',
    flex: 1,
  },
  pointRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pointText: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0ea663',
    borderColor: '#0b7f4d',
    borderRadius: 16,
    borderWidth: 2,
    elevation: 6,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 10,
    shadowColor: '#0ea663',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ebfbf2',
    borderColor: '#b7e4c9',
    borderRadius: 16,
    borderWidth: 2,
    elevation: 2,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: 10,
    shadowColor: '#9dcbb2',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.14,
    shadowRadius: 9,
  },
  secondaryButtonText: {
    color: '#155e3b',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e3ece7',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    padding: 14,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dbe9e2',
    borderRadius: 16,
    borderWidth: 1,
    flexBasis: '48.5%',
    paddingVertical: 16,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  statValue: {
    color: '#0ea663',
    fontSize: 31,
    fontWeight: '800',
    marginTop: 6,
  },
  statsGrid: {
    marginTop: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
});
