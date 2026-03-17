# Smart Parking System

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Admin authentication with two hardcoded admin accounts:
  - Default admin: first login sets credentials
  - Second admin: username `Amol4383`, password `Amol@4383`
- User login: simple entry of name + car number (no password)
- Parking spot management system with floor mode toggle (single vs multi-floor)
- Admin can add/remove floors and spots per floor in multi-floor mode
- Admin can mark spots as unavailable (maintenance)
- Visual color-coded spot map: green=available, red=occupied, yellow=reserved
- Booking system: users pick an available spot, booking must be at least 30 min before desired start time
- Booking confirmation in-app with receipt/bill
- Payment flow: online (Stripe) and offline (cash, admin marks paid manually)
- Auto-generated bill/receipt per booking with car number, spot, time, amount
- Admin dashboard with stats: total spots, occupancy rate, today's revenue
- Booking history lookup by car number for users
- In-app notifications when parking time is nearly up (15 min warning)
- Admin can view and manage all bookings
- Admin can manage floor layout and spot counts

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend: Admin auth with role-based access (two admin accounts + user sessions by name+car)
2. Backend: Parking spot data model with floor support, spot status (available/occupied/reserved/maintenance)
3. Backend: Booking data model with start/end time, payment status, car number
4. Backend: Floor management (single vs multi-floor toggle, add/remove floors, set spots per floor)
5. Backend: Payment recording (online via Stripe, offline cash confirmation by admin)
6. Backend: Bill/receipt generation per booking
7. Backend: Notification triggers for near-expiry bookings
8. Frontend: Login page (admin vs user path)
9. Frontend: Admin dashboard (stats, spot map, booking management, floor control, payment management)
10. Frontend: User dashboard (spot map, booking flow, payment, history)
11. Frontend: Receipt/bill view and download
12. Frontend: In-app notification banner for expiring bookings
