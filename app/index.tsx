import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Link, Redirect, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '@/src/context/AuthContext';

export default function LoginScreen() {
  const { signIn, user, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length >= 6 && !submitting;
  }, [email, password, submitting]);

  const onLogin = async () => {
    if (!canSubmit) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSubmitting(true);

    try {
      await signIn(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to login';
      Alert.alert('Sign in failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (user && profile) {
    if (profile.role === 'busAdmin') {
      return <Redirect href={'/bus-admin' as Href} />;
    }

    return <Redirect href="/home" />;
  }

  return (
    <LinearGradient colors={['#eaf5f0', '#ecf4f3', '#f5f7f7']} style={styles.page}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', default: undefined })}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.iconBubble}>
              <FontAwesome6 name="bus" size={28} color="#16a34a" />
              <Text style={styles.brandText}>Go Bus</Text>
            </View>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your GoBus account</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#98a2b3"
                style={styles.input}
                value={email}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                onChangeText={setPassword}
                placeholder="........"
                placeholderTextColor="#98a2b3"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            <Pressable
              disabled={!canSubmit}
              onPress={onLogin}
              style={[styles.button, !canSubmit && styles.buttonDisabled]}>
              <Text style={styles.buttonText}>{submitting ? 'Signing In...' : 'Sign In'}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.linkRow}>
              <Text style={styles.bottomText}>New to GoBus? </Text>
              <Link href="/signup" style={styles.linkText}>
                Create an account
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: 22,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#7aa89b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  iconBubble: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  brandText: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: '#0f172a',
    fontSize: 38,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#667085',
    fontSize: 15,
    marginBottom: 22,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 12,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#0d9f63',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#08915a',
    marginTop: 8,
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: '#0d9f63',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  dividerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dividerLine: {
    backgroundColor: '#d1d5db',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#98a2b3',
    fontSize: 14,
    fontWeight: '700',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingBottom: 4,
  },
  bottomText: {
    color: '#667085',
    fontSize: 16,
  },
  linkText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingWrapper: {
    alignItems: 'center',
    backgroundColor: '#eef4f2',
    flex: 1,
    justifyContent: 'center',
  },
});
