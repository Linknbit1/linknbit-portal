# Linknbit War Room WordPress Integration Plan

Yes, team member creation can be integrated with WordPress users, and yes, the app can use the WordPress database after integration.

## Recommended Shape

Build this as a small WordPress plugin, not as pasted page code.

- WordPress owns authentication through `wp_users`.
- WordPress capabilities decide who is an admin.
- Linknbit War Room stores app-specific data in custom tables.
- The frontend calls WordPress REST API endpoints instead of mutating JavaScript arrays.

## Team Members

Use WordPress users as the source of truth.

Suggested mapping:

- `wp_users.ID` -> Linknbit War Room member ID
- `display_name` -> member name
- `user_email` -> contact email
- WordPress role/capability -> `admin` or `member`
- `wp_usermeta` -> department, avatar, notification preferences

Adding a member from Linknbit War Room should call a server endpoint that uses:

```php
wp_insert_user([
  'user_login'   => $login,
  'user_email'   => $email,
  'display_name' => $name,
  'role'         => 'subscriber',
]);
```

For existing WordPress users, Linknbit War Room should attach metadata instead of creating a duplicate user.

## Database

Use custom tables for Linknbit War Room data. Do not put everything into `wp_options`.

Suggested tables:

- `wp_linknbit_war_room_points`
- `wp_linknbit_war_room_rewards`
- `wp_linknbit_war_room_reward_claims`
- `wp_linknbit_war_room_quests`
- `wp_linknbit_war_room_shoutouts`
- `wp_linknbit_war_room_penalties`
- `wp_linknbit_war_room_team_performance`
- `wp_linknbit_war_room_attendance`
- `wp_linknbit_war_room_attendance_requests`
- `wp_linknbit_war_room_messages`

Example performance table:

```sql
CREATE TABLE wp_linknbit_war_room_team_performance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  month CHAR(7) NOT NULL,
  team_key VARCHAR(40) NOT NULL,
  revenue TINYINT UNSIGNED DEFAULT 0,
  quality TINYINT UNSIGNED DEFAULT 0,
  client TINYINT UNSIGNED DEFAULT 0,
  teamwork TINYINT UNSIGNED DEFAULT 0,
  ownership TINYINT UNSIGNED DEFAULT 0,
  consistency TINYINT UNSIGNED DEFAULT 0,
  created_by BIGINT UNSIGNED NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY month_team (month, team_key)
);
```

## Attendance

Self check-in must be verified by WordPress/PHP, not by client-side JavaScript.

Recommended checks:

- User must be logged in with `is_user_logged_in()`.
- The REST request must include a valid `X-WP-Nonce`.
- The request IP must match an office allowlist, trusted VPN, or trusted proxy rule.
- The check-in must be inside the configured time window.
- Award attendance XP only when the server-recorded check-in time is at or before the configured on-time cutoff.
- One attendance record per user per date should be enforced with a unique database key.

Suggested attendance table:

```sql
CREATE TABLE wp_linknbit_war_room_attendance (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  checkin_time TIME NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  method VARCHAR(80) NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  xp_awarded INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  UNIQUE KEY user_day (user_id, attendance_date)
);
```

Store attendance settings in an option or a small settings table:

```php
[
  'checkin_start' => '08:00',
  'on_time_until' => '09:30',
  'checkin_end'   => '11:00',
  'on_time_xp'    => 3,
  'office_ips'    => ['203.0.113.10'],
]
```

Suggested correction request table:

```sql
CREATE TABLE wp_linknbit_war_room_attendance_requests (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  decided_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL
);
```

Important: if the site is behind Cloudflare, Nginx, or another reverse proxy, only trust forwarded IP headers after explicitly configuring trusted proxy addresses. Otherwise use `REMOTE_ADDR`.

## REST Endpoints

Suggested endpoints:

- `GET /linknbit-war-room/v1/me`
- `GET /linknbit-war-room/v1/members`
- `POST /linknbit-war-room/v1/members`
- `GET /linknbit-war-room/v1/rewards`
- `POST /linknbit-war-room/v1/rewards`
- `POST /linknbit-war-room/v1/reward-claims`
- `GET /linknbit-war-room/v1/team-performance`
- `POST /linknbit-war-room/v1/team-performance`
- `GET /linknbit-war-room/v1/attendance/today`
- `POST /linknbit-war-room/v1/attendance/checkin`
- `GET /linknbit-war-room/v1/attendance/settings`
- `POST /linknbit-war-room/v1/attendance/settings`
- `POST /linknbit-war-room/v1/attendance/corrections`
- `POST /linknbit-war-room/v1/attendance/corrections/{id}/decide`

Every write endpoint should check:

```php
current_user_can('manage_options')
```

or a custom capability such as:

```php
current_user_can('linknbit_war_room_manage')
```

## Frontend Changes Later

The static preview currently uses local arrays. In WordPress, replace those arrays with API-loaded state:

```js
const apiRoot = window.linknbitWarRoomSettings.restUrl;
const nonce = window.linknbitWarRoomSettings.nonce;

async function lwrFetch(path, options = {}) {
  const res = await fetch(apiRoot + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': nonce,
      ...(options.headers || {})
    }
  });
  if (!res.ok) throw new Error('Linknbit War Room API error');
  return res.json();
}
```

The app should be localized from PHP with:

```php
wp_localize_script('linknbit-war-room', 'linknbitWarRoomSettings', [
  'restUrl' => esc_url_raw(rest_url('linknbit-war-room/v1')),
  'nonce'   => wp_create_nonce('wp_rest'),
  'userId'  => get_current_user_id(),
]);
```

## Implementation Order

1. Create the WordPress plugin shell.
2. Enqueue `linknbit-war-room.css` and `linknbit-war-room.js`.
3. Replace preview login with the current WordPress user.
4. Add custom tables on plugin activation.
5. Add REST endpoints for members, rewards, and performance.
6. Replace local arrays with API calls.
7. Add nonce and capability checks to all writes.


