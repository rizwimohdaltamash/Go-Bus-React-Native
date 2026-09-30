<div align="center">

# 🚌 Go Bus

### Book bus tickets and manage bus fleets, all in one mobile app.

<br/>

<table>
  <tr>
    <td align="center" width="96">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="48" height="48" alt="React Native"/>
      <br/><sub><b>React Native</b></sub>
    </td>
    <td align="center" width="96">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/expo/white"/>
        <img src="https://cdn.simpleicons.org/expo/000020" width="48" height="48" alt="Expo"/>
      </picture>
      <br/><sub><b>Expo</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="48" height="48" alt="TypeScript"/>
      <br/><sub><b>TypeScript</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/firebase/firebase-original.svg" width="48" height="48" alt="Firebase"/>
      <br/><sub><b>Firebase</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="48" height="48" alt="Node.js"/>
      <br/><sub><b>Node.js</b></sub>
    </td>
    <td align="center" width="96">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/android/android-original.svg" width="48" height="48" alt="Android"/>
      <br/><sub><b>Android</b></sub>
    </td>
    <td align="center" width="96">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/apple/white"/>
        <img src="https://cdn.simpleicons.org/apple/000000" width="48" height="48" alt="iOS"/>
      </picture>
      <br/><sub><b>iOS</b></sub>
    </td>
  </tr>
</table>

</div>

<br/>

**Go Bus** is a cross-platform bus ticket booking app built with **React Native** and **Expo**, with **Firebase** as the backend. One app serves two kinds of users:

- **🧑 Passengers** search buses by route and date, choose seats on a two-deck seat map, pay, and get a ticket with a PNR that they can save as a PDF and share.
- **🧑‍✈️ Bus operators** register their buses with routes, schedules, and fares, then manage bookings: they can see who booked which seat and cancel tickets when needed.

### ✨ Key features

| | |
| :-- | :-- |
| 🎫 **Two-deck seat map** | Pick seats on the lower or upper deck. Seats that are already booked are locked. |
| 🔐 **Role-based access** | Passengers and operators each see only their own screens. |
| 🧾 **PDF tickets** | Tickets are generated on the phone and can be shared to WhatsApp, Gmail, and others. |
| 🔢 **Booking ID + PNR** | Every booking gets a unique ID and PNR. |
| 🚍 **Fleet management** | Operators can register, edit, and delete their buses. |
| ❌ **Cancellations** | Passengers or operators can cancel a booking, which frees its seats again. |

---

## 1. Roles at a glance

| | 🧑 Passenger (`user`) | 🧑‍✈️ Bus operator (`busAdmin`) |
| :-- | :-- | :-- |
| **Main job** | Find a bus, pick seats, pay, get a ticket | Add buses and manage their bookings |
| **Tabs** | Home · Search · Bookings · My Bookings · Profile | Register Bus · My Buses · User Bookings · Profile |
| **Can create** | Bookings | Buses |
| **Can edit** | Cancel their own booking | Edit or delete their own buses, cancel any booking on their buses |
| **Extras** | Download/share a PDF ticket, haptic feedback | Duration is calculated automatically from departure/arrival times |

---

## 2. Quick start

**Prerequisites:** Node.js 18+ and npm. To run on a phone you need the [Expo Go](https://expo.dev/go) app, or you can use an Android emulator or iOS simulator.

```bash
git clone https://github.com/rizwimohdaltamash/Go-Bus-React-Native.git
cd Go-Bus-React-Native
npm install
npx expo start
```

Then press **`a`** for Android, **`i`** for iOS, or **`w`** for web, or scan the QR code with Expo Go.

### Using your own Firebase project (optional)

The app already points to a Firebase project. To use your own:

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Turn on **Authentication → Email/Password** and **Cloud Firestore**.
3. Replace the `firebaseConfig` object in [`src/firebase/firebase.ts`](src/firebase/firebase.ts) with your web app config.

> [!NOTE]
> The app reads its config from `src/firebase/firebase.ts`. [`src/firebase/firebaseConfig.js`](src/firebase/firebaseConfig.js) is a duplicate that nothing imports.

### npm scripts

| Command | What it does |
| :-- | :-- |
| `npm start` | Starts the Expo dev server |
| `npm run android` / `npm run ios` | Builds and runs a native development build |
| `npm run web` | Runs the app in a browser |
| `npm run lint` | Runs ESLint (Expo config) |

---

## 3. Architecture

This is a **client-only app with no custom server**. Screens call Firebase directly: Auth for login, and Firestore for all data.

```mermaid
flowchart LR
    subgraph Device["📱 Expo app"]
        direction TB
        Router["Expo Router<br/><i>app/</i>"]
        Auth["AuthContext<br/><i>src/context</i>"]
        Utils["bookingUtils<br/><i>src/utils</i>"]
        Native["expo-print · expo-sharing<br/>expo-haptics · AsyncStorage"]

        Router -->|useAuth| Auth
        Router -->|seat lookup, save booking| Utils
        Router --> Native
    end

    subgraph Firebase["☁️ Firebase"]
        FA[("Firebase Auth")]
        FS[("Cloud Firestore<br/>users · buses · bookings")]
    end

    Auth -->|sign in / sign up / sign out| FA
    Auth -->|read + write profile| FS
    Utils -->|query + addDoc bookings| FS
    Router -->|"CRUD buses, cancel bookings"| FS
```

| Layer | Location | Responsibility |
| :-- | :-- | :-- |
| **Screens** | [`app/`](app/) | UI plus most data access (Firestore calls are made inside screens) |
| **Auth** | [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx) | Exposes `user`, `profile`, `signIn`, `signUp`, and `logout` to the whole app |
| **Booking helpers** | [`src/utils/bookingUtils.ts`](src/utils/bookingUtils.ts) | Seat ID mapping, ID/PNR generation, fetching booked seats, saving bookings |
| **Firebase init** | [`src/firebase/firebase.ts`](src/firebase/firebase.ts) | Initializes the app, Auth (session saved in AsyncStorage on native), and Firestore |

---

## 4. Navigation & access control

Routes are file-based ([Expo Router](https://docs.expo.dev/router/introduction/)). Access is enforced in the **layout files**: each tab group checks the user's role and redirects anyone who doesn't belong there.

```mermaid
flowchart TD
    Start([App opens]) --> Login["/ &nbsp;Login<br/><i>app/index.tsx</i>"]
    Login <-->|link| Signup["/signup<br/><i>choose role</i>"]

    Login -->|"role = user"| UserTabs
    Login -->|"role = busAdmin"| AdminTabs

    subgraph UserTabs["(tabs) — passenger"]
        Home[Home] --> Search[Search]
        Search -->|Select & Continue| Seat["/seat-selection"]
        Seat -->|booking saved| MyB[My Bookings]
        Bookings["Bookings<br/><i>placeholder</i>"]
        Profile[Profile]
    end

    subgraph AdminTabs["bus-admin — operator"]
        Reg[Register Bus] 
        MyBuses[My Buses] -->|edit| Edit["edit-bus/[id]"]
        AdminBk[User Bookings]
        AProfile[Profile]
    end

    UserTabs -. "busAdmin opens it → redirect" .-> AdminTabs
    AdminTabs -. "user opens it → redirect" .-> UserTabs
```

**How the role is resolved** ([`AuthContext.tsx`](src/context/AuthContext.tsx)):

```mermaid
sequenceDiagram
    participant App
    participant Ctx as AuthContext
    participant FA as Firebase Auth
    participant FS as Firestore

    App->>Ctx: mount AuthProvider
    Ctx->>FA: onAuthStateChanged()
    alt signed out
        FA-->>Ctx: null
        Ctx-->>App: user = null → layouts redirect to "/"
    else signed in
        FA-->>Ctx: Firebase user (uid)
        Ctx->>FS: getDoc(users/{uid})
        alt profile exists
            FS-->>Ctx: { role: "user" | "busAdmin", ... }
        else no profile yet
            Ctx->>FS: setDoc(users/{uid}, role: "user")
        end
        Ctx-->>App: profile → layout routes by role
    end
```

---

## 5. Booking flow

This is the passenger path, from search to ticket.

```mermaid
sequenceDiagram
    actor P as Passenger
    participant S as Search screen
    participant Seat as Seat selection
    participant FS as Firestore
    participant MB as My Bookings

    P->>S: open Search
    S->>FS: getDocs(buses) — all buses
    S->>FS: fetchBookedSeatIds(busId) — once per bus
    P->>S: enter from / to / date
    Note over S: filtering happens on the device
    P->>Seat: Select & Continue (bus passed as route param)
    Seat->>FS: fetchBookedSeatIds(busId) — refresh
    Note over Seat: booked seats are locked,<br/>taken seats are deselected
    P->>Seat: tap seats → Proceed
    Seat->>P: payment dialog (Success / Fail)

    alt Success
        Seat->>Seat: generate bookingId (10 chars) + PNR (6 chars)
        Seat->>FS: addDoc(bookings, status: "confirmed")
        Seat->>MB: router.replace("/(tabs)/my-bookings")
        P->>MB: Download / Share ticket
        MB->>MB: HTML → PDF (expo-print) → share sheet (expo-sharing)
    else Fail
        Seat->>P: error message, nothing saved
    end
```

### Booking status

```mermaid
stateDiagram-v2
    direction LR
    [*] --> confirmed: payment success
    confirmed --> cancelled: passenger cancels<br/>(cancelledBy = "user")
    confirmed --> cancelled: operator cancels<br/>(cancelledBy = "admin")
    cancelled --> [*]
```

A cancelled booking is **kept, not deleted**. Its seats become free again because seat lookups only count `status == "confirmed"`.

---

## 6. Data model

There are three Firestore collections. A booking stores a **copy of the bus details** (`bus`), so its ticket still shows the original information even if the operator edits the bus later.

```mermaid
erDiagram
    USERS ||--o{ BUSES : "registers (busAdmin)"
    USERS ||--o{ BOOKINGS : "makes (user)"
    BUSES ||--o{ BOOKINGS : "has"

    USERS {
        string uid PK "= Firebase Auth uid (doc id)"
        string name
        string email
        string role "user | busAdmin"
        string createdAt "ISO timestamp"
    }

    BUSES {
        string id PK "auto doc id"
        string adminUid FK "-> users.uid"
        string adminName
        string busName
        string vehicleType
        string busType
        string fromCity
        string toCity
        string startDate "YYYY-MM-DD"
        string reachingDate "YYYY-MM-DD"
        string departureTime
        string departureMeridiem "AM | PM"
        string arrivalTime
        string arrivalMeridiem "AM | PM"
        string duration "computed"
        string stops "comma separated"
        number price "per seat, INR"
        number totalSeats
        string createdAt
    }

    BOOKINGS {
        string id PK "auto doc id"
        string bookingId "10 chars"
        string pnr "6 chars"
        string busId FK "-> buses.id"
        object bus "snapshot of bus"
        string userId FK "-> users.uid"
        string userName
        string userEmail
        array seats "L1, U4"
        array seatIds "L-1-1, U-1-4"
        number passengerCount
        number totalPrice
        string bookingDate "journey date"
        string status "confirmed | cancelled"
        string createdAt
        string cancelledBy "user | admin (optional)"
        string cancelledByUid "optional"
        string cancelledAt "optional"
    }
```

**Queries used by the app:**

| Screen | Query |
| :-- | :-- |
| Search | `buses` (all docs), then `bookings where busId == X and status == "confirmed"` for each bus |
| My Bookings | `bookings where userId == uid` |
| My Buses / Admin Profile | `buses where adminUid == uid` |
| User Bookings (admin) | `bookings where busId in [...]` (in chunks, because Firestore limits `in` queries) |

---

## 7. Seat layout

Every bus is drawn as **two decks with 18 seats each** (36 seats in total), in rows of 6. The label shown on screen (`L7`) is converted into a grid ID (`L-2-1`), and that ID is what gets stored in `seatIds`:

```
          col 1   col 2   col 3   col 4   col 5   col 6
        ┌───────┬───────┬───────┬───────┬───────┬───────┐
 row 1  │  L1   │  L2   │  L3   │  L4   │  L5   │  L6   │   Lower deck
 row 2  │  L7   │  L8   │  L9   │  L10  │  L11  │  L12  │   (Upper deck is
 row 3  │  L13  │  L14  │  L15  │  L16  │  L17  │  L18  │    identical with "U")
        └───────┴───────┴───────┴───────┴───────┴───────┘

   L7  →  row = ceil(7 / 6) = 2,  col = ((7 − 1) % 6) + 1 = 1  →  "L-2-1"
```

```ts
// src/utils/bookingUtils.ts
export function seatLabelToId(label: string): string {
  const prefix = label[0];
  const num = parseInt(label.slice(1), 10);
  const row = Math.ceil(num / 6);
  const col = ((num - 1) % 6) + 1;
  return `${prefix}-${row}-${col}`;
}
```

A seat shows as **booked** when its ID appears in any confirmed booking for that bus.

---

## 8. Project structure

```text
go-bus/
├── app/                          # Screens (Expo Router — file = route)
│   ├── _layout.tsx               # Root stack, wraps everything in <AuthProvider>
│   ├── index.tsx                 # Login → redirects by role
│   ├── signup.tsx                # Sign up + role picker
│   ├── seat-selection.tsx        # Seat map, payment dialog, saves booking
│   ├── (tabs)/                   # Passenger area (layout blocks busAdmin)
│   │   ├── home.tsx
│   │   ├── search.tsx            # Loads buses, filters by city/date
│   │   ├── booking.tsx           # Placeholder ("coming next")
│   │   ├── my-bookings.tsx       # Ticket list, cancel, PDF share
│   │   └── profile.tsx
│   └── bus-admin/                # Operator area (layout blocks non-admins)
│       ├── index.tsx             # Register bus form
│       ├── my-buses.tsx          # List / delete buses
│       ├── edit-bus/[id].tsx     # Edit a bus
│       ├── admin-bookings.tsx    # Bookings on my buses, cancel
│       └── profile.tsx
│       # register-bus.tsx, user-bookings.tsx, (tabs)/bookings.tsx = legacy redirects
├── src/
│   ├── context/AuthContext.tsx   # Auth state + role
│   ├── firebase/firebase.ts      # Firebase init (config lives here)
│   ├── utils/bookingUtils.ts     # Seat IDs, PNR, fetch/save bookings
│   └── components/RazorpayWebView.tsx   # Razorpay checkout (not wired in yet)
├── components/                   # Shared UI (HapticTab, themed text/view, icons)
├── constants/theme.ts            # Colors
├── hooks/                        # Color scheme helpers
├── app.json                      # Expo config (package: com.altamash_0074.gobus)
└── eas.json                      # EAS build profiles
```

---

## 9. Building with EAS

| Profile | Output | Use it for |
| :-- | :-- | :-- |
| `preview` | `.apk` | Installing directly on Android devices for testing |
| `production` | `.aab` | Uploading to the Google Play Store |

```bash
npm install -g eas-cli
eas login

eas build -p android --profile preview      # APK
eas build -p android --profile production   # AAB
```

---

## 10. Known limitations

These are worth knowing before you extend the app or ship it.

| Area | Current behaviour | Suggested fix |
| :-- | :-- | :-- |
| **Payments** | Checkout is a **simulated** Success/Fail dialog (payment ID `SIM_<timestamp>`). `RazorpayWebView` exists but no screen uses it. | Connect `RazorpayWebView` in `seat-selection.tsx` and verify payments on a server. |
| **Double booking** | Seats are checked when the screen opens, then saved with `addDoc`. Two users can book the same seat at the same moment. | Save the booking inside a Firestore transaction, or add a security rule that checks the seats. |
| **Search** | Downloads **all** buses and runs one bookings query per bus, then filters on the device. | Query with `where('fromCity', '==', …)` and load booked seats only for the chosen bus. |
| **Seat count** | The seat map is always 2 × 18 seats. The `totalSeats` field doesn't change the layout. | Build the grid from `totalSeats` and `busType`. |
| **Security rules** | This repo doesn't include any Firestore rules. | Add `firestore.rules` that enforce roles and ownership. |
| **Bookings tab** | Placeholder screen. | — |

---

## 11. Troubleshooting

| Problem | Fix |
| :-- | :-- |
| Metro shows stale or odd module errors | `npx expo start -c` to clear the cache |
| `permission-denied` from Firestore | Your Firestore rules block the read/write. Check them in the Firebase Console. |
| PDF share does nothing on web | `expo-sharing` isn't supported in most desktop browsers. Test on a device or emulator. |
| Logged in but stuck on the wrong tabs | The role comes from `users/{uid}.role` in Firestore. Check that value. |
| No haptic feedback | Turn on vibration/haptics in the device settings. There is no haptic feedback on web. |
