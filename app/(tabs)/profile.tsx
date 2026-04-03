import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { collection, getDocs, query, where } from 'firebase/firestore';

import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/firebase/firebase';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [totalBookings, setTotalBookings] = useState(0);
  const [loadingBookings, setLoadingBookings] = useState(true);

  const roleLabel = profile?.role === 'busAdmin' ? 'Bus Admin' : 'Passenger';
  const roleBadgeStyle = profile?.role === 'busAdmin' ? styles.roleBadgeAdmin : styles.roleBadgeUser;
  const roleTextStyle = profile?.role === 'busAdmin' ? styles.roleTextAdmin : styles.roleTextUser;
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const onSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace('/');
  };

  const fetchUserBookingsCount = useCallback(async () => {
    if (!profile?.uid) {
      setTotalBookings(0);
      setLoadingBookings(false);
      return;
    }

    try {
      setLoadingBookings(true);
      const q = query(
        collection(db, 'bookings'),
        where('userId', '==', profile.uid),
        where('status', '==', 'confirmed')
      );
      const snap = await getDocs(q);
      setTotalBookings(snap.size);
    } catch (error) {
      console.error('[ProfileBookingsCount]', error);
      setTotalBookings(0);
    } finally {
      setLoadingBookings(false);
    }
  }, [profile?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchUserBookingsCount();
    }, [fetchUserBookingsCount])
  );

  return (
    <View style={styles.page}>
      <View
        style={[
          styles.content,
          {
            paddingBottom: insets.bottom + 28,
            paddingTop: insets.top + 10,
          },
        ]}
      >
      <View style={styles.headerSection}>
        <View style={styles.avatarCircle}>
          <FontAwesome6 color="#ffffff" iconStyle="solid" name="user" size={24} />
        </View>
        <Text style={styles.name}>{profile?.name ?? 'GoBus User'}</Text>
        <View style={[styles.roleBadge, roleBadgeStyle]}>
          <Text style={[styles.roleText, roleTextStyle]}>{roleLabel}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconWrap}>
          <MaterialIcons color="#16a34a" name="badge" size={22} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>FULL NAME</Text>
          <Text style={styles.infoValue}>{profile?.name ?? 'GoBus User'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconWrap}>
          <MaterialIcons color="#16a34a" name="email" size={22} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>EMAIL ADDRESS</Text>
          <Text style={styles.infoValue}>{profile?.email ?? '-'}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconWrap}>
          <FontAwesome6 color="#16a34a" iconStyle="solid" name="ticket" size={20} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>TOTAL BOOKINGS</Text>
          <Text style={styles.infoValue}>{loadingBookings ? 'Loading...' : `${totalBookings} trips`}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconWrap}>
          <MaterialIcons color="#16a34a" name="calendar-month" size={22} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>MEMBER SINCE</Text>
          <Text style={styles.infoValue}>{memberSince}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={() => router.push('/home')}
          style={[styles.actionButton, styles.backButton]}
        >
          <MaterialIcons color="#475467" name="home" size={21} />
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>

        <Pressable
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          onPress={onSignOut}
          style={[styles.actionButton, styles.signoutButton]}
        >
          <MaterialIcons color="#ef4444" name="logout" size={21} />
          <Text style={styles.signoutText}>Sign Out</Text>
        </Pressable>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#f1f7f5',
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    alignItems: 'center',
    backgroundColor: '#18b86e',
    borderRadius: 42,
    height: 84,
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#18b86e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    width: 84,
  },
  name: {
    color: '#0f172a',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    marginBottom: 8,
  },
  roleBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleBadgeUser: {
    backgroundColor: '#d8f5e3',
  },
  roleBadgeAdmin: {
    backgroundColor: '#dbecff',
  },
  roleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  roleTextUser: {
    color: '#16a34a',
  },
  roleTextAdmin: {
    color: '#1d4ed8',
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginTop: 12,
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#ecfdf3',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  infoCopy: {
    flex: 1,
    justifyContent: 'center',
  },
  infoLabel: {
    color: '#98a2b3',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: '#101828',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 52,
  },
  backButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d0d5dd',
  },
  signoutButton: {
    backgroundColor: '#fff5f5',
    borderColor: '#fecaca',
  },
  backButtonText: {
    color: '#344054',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  signoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
