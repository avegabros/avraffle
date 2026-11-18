# Google Play Store Listing Metadata & Submission Guidelines

## 1. App Details & Descriptions

### App Name (max 30 characters)
```text
AV-Raffle
```

---

### Short Description (max 80 characters)
*Note: Must be concise, descriptive, and distinctly different from the Full Description.*
```text
Official event companion and raffle management app for Avega Bros employees.
```
*(Character count: 76 characters)*

---

### Full Description (max 4000 characters)
```text
AV-Raffle is the official internal event companion and remote coordination tool for Avega Bros Integrated Shipping Corp. corporate events, annual celebrations, and company raffle draws.

Designed exclusively for Avega Bros employees, event organizers, and stage committees, this application connects seamlessly with the live AV-Raffle event stage display to deliver an interactive, transparent, and streamlined event experience.

Key Features:

• Emcee Stage Remote:
Authorized event emcees and stage coordinators can trigger and manage digital raffle wheel rotations in real time with synchronized audiovisual effects on the main stage display.

• Registration & Desk Attendance:
Event registration staff can quickly look up attendees, verify employee identification, update attendance status, and capture attendee portraits for stage celebration announcements.

• Real-Time Prize Catalog:
Browse available prizes, view allocation details across corporate office locations, and track claimed awards live throughout the event.

• Employee Ticket Verification:
Attendees can look up their raffle eligibility, registered ticket numbers, and prize claim status.

• Secure Corporate Access:
Role-based PIN verification ensures only authorized event staff and emcees can control stage actions and access administrative event functions.

Requirements:
This application is intended for internal company use by employees and event staff of Avega Bros Integrated Shipping Corp. An active corporate event server connection is required to utilize remote functions.
```

---

## 2. Privacy Policy Setup

### Privacy Policy URL
```text
https://avraffle.abas.ph/privacy
```

### Common causes for Google Play flagging the Privacy Policy:
1. **Trailing Slash mismatch or redirect:** When saving in Google Play Console, enter exact URL `https://avraffle.abas.ph/privacy`.
2. **Cloudflare Bot / Geo-blocking:** Ensure Cloudflare does not block Google crawlers or IP ranges outside the Philippines.
3. **App Content Declaration:** Confirm in Play Console under **Policy > App Content > Privacy Policy** that the URL is saved and verified.

---

## 3. Play Store Resubmission Steps

1. Go to **Google Play Console** > Select **AV-Raffle**.
2. **Fix Issue 1 (Privacy Policy):**
   - Navigate to **App content** (`Policy and programs` > `App content`).
   - Click **Start** / **Manage** under **Privacy Policy**.
   - Paste: `https://avraffle.abas.ph/privacy`
   - Click **Save**.
3. **Fix Issue 2 (Store Listing Metadata):**
   - Navigate to **Grow** > **Store presence** > **Main store listing**.
   - Check all languages (including Default - English and any auto-translations).
   - Verify that **Short description** and **Full description** are **NOT identical** in ANY language:
     - **Short description:**
       `Official event companion and raffle management app for Avega Bros employees.`
     - **Full description:**
       *(Paste the full description provided above)*
   - If auto-translations were enabled, click each translated language tab and replace with proper translated text, or delete non-primary translations so they don't default to duplicate text strings.
   - Click **Save**.
4. **Resubmit:**
   - Go to **Publishing overview**.
   - Review pending changes.
   - Click **Send changes for review**.

