import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { FontAwesome6, MaterialIcons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/context/AuthContext';
import { db } from '@/src/firebase/firebase';

export default function BusAdminProfileScreen() {
  const { profile, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [totalBuses, setTotalBuses] = useState(0);

  const fetchBusCount = useCallback(async () => {
    if (!profile?.uid) {
      setTotalBuses(0);
      return;
    }

    try {
      const q = query(collection(db, 'buses'), where('adminUid', '==', profile.uid));
      const snap = await getDocs(q);
      setTotalBuses(snap.size);
    } catch {
      setTotalBuses(0);
    }
  }, [profile?.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchBusCount();
    }, [fetchBusCount]),
  );

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : '-';

  const onSignOut = async () => {
    await logout();
    router.replace('/');
  };

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
        <Text style={styles.name}>{profile?.name ?? 'Bus Admin'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Bus Admin</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.iconWrap}>
          <MaterialIcons color="#16a34a" name="badge" size={22} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>FULL NAME</Text>
          <Text style={styles.infoValue}>{profile?.name ?? 'Bus Admin'}</Text>
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
          <MaterialIcons color="#16a34a" name="directions-bus" size={22} />
        </View>
        <View style={styles.infoCopy}>
          <Text style={styles.infoLabel}>TOTAL BUSES REGISTERED</Text>
          <Text style={styles.infoValue}>{`${totalBuses} bus${totalBuses === 1 ? '' : 'es'}`}</Text>
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
          onPress={() => router.push('/bus-admin/my-buses')}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          style={[styles.actionButton, styles.backButton]}
        >
          <MaterialIcons color="#475467" name="directions-bus" size={21} />
          <Text style={styles.backButtonText}>My Buses</Text>
        </Pressable>

        <Pressable
          onPress={onSignOut}
          onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
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
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  roleText: {
    color: '#d97706',
    fontSize: 15,
    fontWeight: '700',
  },
  infoCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
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
