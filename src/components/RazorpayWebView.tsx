import React, { useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Types ───────────────────────────────────────────────────────────────────

export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
};

type Props = {
  visible: boolean;
  amount: number;           // in RUPEES – converted ×100 inside HTML
  name: string;
  description: string;
  prefillName?: string;
  prefillEmail?: string;
  prefillContact?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: (error: string) => void;
  onDismiss: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const RAZORPAY_KEY_ID = 'rzp_test_oy0ogDNk4xSPEB';

/**
 *  IMPORTANT – baseUrl MUST be an https:// origin so Android WebView
 *  allows loading the Razorpay checkout script (same-origin / mixed-content
 *  rules block it when baseUrl is file:///).
 */
const WEBVIEW_BASE_URL = 'https://checkout.razorpay.com';

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildHtml(opts: {
  amount: number;
  name: string;
  description: string;
  prefillName: string;
  prefillEmail: string;
  prefillContact: string;
}): string {
  const amountPaise = Math.round(opts.amount * 100);

  // Escape values to prevent accidental JS injection from names / emails
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      background:#f3faf8;display:flex;align-items:center;
      justify-content:center;height:100vh;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    }
    .loader{display:flex;flex-direction:column;align-items:center;gap:16px}
    .spinner{
      width:52px;height:52px;
      border:4px solid #dbe9e2;border-top-color:#0ea663;
      border-radius:50%;animation:spin .8s linear infinite;
    }
    @keyframes spin{to{transform:rotate(360deg)}}
    p{color:#475467;font-size:15px;font-weight:600}
  </style>
</head>
<body>
  <div class="loader">
    <div class="spinner"></div>
    <p>Opening Payment Gateway…</p>
  </div>

  <script>
    // Dynamically load Razorpay checkout so we know exactly when it's ready
    (function(){
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onerror = function(){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:'FAILURE',
          data:'Unable to load payment gateway. Check internet connection.'
        }));
      };
      s.onload = function(){
        var options = {
          key: "${RAZORPAY_KEY_ID}",
          amount: ${amountPaise},
          currency: "INR",
          name: "${esc(opts.name)}",
          description: "${esc(opts.description)}",
          prefill: {
            name: "${esc(opts.prefillName)}",
            email: "${esc(opts.prefillEmail)}",
            contact: "${esc(opts.prefillContact)}"
          },
          theme: { color: "#0ea663" },
          modal: {
            backdropclose: false,
            escape: false,
            ondismiss: function(){
              window.ReactNativeWebView.postMessage(JSON.stringify({ type:'DISMISS' }));
            }
          },
          handler: function(response){
            // Payment SUCCESS
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type:'SUCCESS',
              data: response
            }));
          }
        };

        var rzp = new Razorpay(options);

        // payment.failed fires when user tries a method and it fails.
        // We do NOT close the modal – Razorpay keeps it open so the user
        // can try another method. We only notify RN to log it.
        rzp.on('payment.failed', function(response){
          var desc = (response && response.error && response.error.description)
            ? response.error.description
            : 'Payment failed. Please try another method.';
          // Just post a PAYMENT_ERROR (not FAILURE) so we stay open
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PAYMENT_ERROR',
            data: desc
          }));
        });

        rzp.open();
      };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RazorpayWebView({
  visible,
  amount,
  name,
  description,
  prefillName = '',
  prefillEmail = '',
  prefillContact = '',
  onSuccess,
  onFailure,
  onDismiss,
}: Props) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const html = buildHtml({
    amount,
    name,
    description,
    prefillName,
    prefillEmail,
    prefillContact,
  });

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: 'SUCCESS' | 'FAILURE' | 'DISMISS' | 'PAYMENT_ERROR';
        data?: RazorpaySuccessResponse | string;
      };

      switch (msg.type) {
        case 'SUCCESS':
          onSuccess(msg.data as RazorpaySuccessResponse);
          break;

        case 'FAILURE':
          // Only fires when script itself fails to load
          onFailure(typeof msg.data === 'string' ? msg.data : 'Payment failed');
          break;

        case 'PAYMENT_ERROR':
          // User tried a method and it failed – Razorpay modal stays open,
          // we just log it; do NOT call onFailure here.
          console.warn('[RazorpayWebView] payment.failed →', msg.data);
          break;

        case 'DISMISS':
          // User explicitly closed Razorpay modal
          onDismiss();
          break;
      }
    } catch {
      // Malformed message — ignore silently
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color="#0f172a" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Secure Payment</Text>

          <View style={styles.headerRight}>
            <Ionicons name="lock-closed" size={14} color="#0ea663" />
            <Text style={styles.secureText}>Secured</Text>
          </View>
        </View>

        {/* ── WebView ── */}
        <WebView
          ref={webViewRef}
          /**
           * Key fix: use an https baseUrl so Android allows loading
           * the Razorpay HTTPS script without mixed-content errors.
           */
          source={{ html, baseUrl: WEBVIEW_BASE_URL }}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          /**
           * 'always' lets the WebView load mixed http/https content.
           * Required so Razorpay's popup iframes (which themselves load
           * payment provider pages) are not blocked.
           */
          mixedContentMode="always"
          originWhitelist={['*']}
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          allowsInlineMediaPlayback
          renderLoading={() => (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color="#0ea663" />
              <Text style={styles.loadingText}>Connecting to payment gateway…</Text>
            </View>
          )}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3faf8',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomColor: '#e4efe9',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  secureText: {
    color: '#0ea663',
    fontSize: 12,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: '#f3faf8',
  },
  loading: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  loadingText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
});
