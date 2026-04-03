import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/src/context/AuthContext';

export default function BusAdminTabLayout() {
  const colorScheme = useColorScheme();
  const { user, profile, loading } = useAuth();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/" />;
  }

  if (profile?.role !== 'busAdmin') {
    return <Redirect href="/home" />;
  }

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#6b7280',
        unmountOnBlur: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
        tabBarItemStyle: {
          flex: 1,
        },
        tabBarStyle: {
          borderTopColor: '#e5e7eb',
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 6,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      } as any}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Register Bus',
          tabBarIcon: ({ color }) => <MaterialIcons size={22} name="add-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="register-bus"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="my-buses"
        options={{
          title: 'My Buses',
          tabBarIcon: ({ color }) => <MaterialIcons size={22} name="directions-bus" color={color} />,
        }}
      />
      <Tabs.Screen
        name="admin-bookings"
        options={{
          title: 'User Bookings',
          tabBarIcon: ({ color }) => <MaterialIcons size={22} name="receipt-long" color={color} />,
        }}
      />
      <Tabs.Screen
        name="user-bookings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="edit-bus/[id]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <MaterialIcons size={22} name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
