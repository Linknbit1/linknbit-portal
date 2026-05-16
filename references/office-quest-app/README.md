# Linknbit War Room Static Preview

This folder is a separated-file version of the original single HTML app.

## Files

- `index.html` - preview shell and app markup
- `assets/css/office-quest.css` - extracted styles
- `assets/js/office-quest.js` - extracted and patched app logic
- `preview-server.js` - optional local static server for environments that prefer `http://localhost`

## Viewing It

Open `index.html` directly in a browser, or run this from the folder:

```bash
node preview-server.js
```

Then visit `http://127.0.0.1:4173/`.

## Preview Login

This static preview does not ship real passwords. Enter a roster ID and choose the matching role tab:

- Admin: `ADMIN-001`
- Player examples: `EMP-001`, `EMP-002`, `EMP-003`, `EMP-004`, `EMP-005`

The preview key field is intentionally optional. For WordPress, authentication should come from the logged-in WordPress user, not from JavaScript.

## WordPress Integration Direction

For WordPress, enqueue the CSS and JS as plugin or theme assets instead of pasting them inline:

```php
wp_enqueue_style(
  'office-quest',
  plugin_dir_url(__FILE__) . 'assets/css/office-quest.css',
  [],
  '1.0.0'
);

wp_enqueue_script(
  'office-quest',
  plugin_dir_url(__FILE__) . 'assets/js/office-quest.js',
  [],
  '1.0.0',
  true
);
```

Next integration step: replace preview login with `is_user_logged_in()`, WordPress roles/capabilities, and server-side AJAX or REST endpoints for saving employees, quests, comments, rewards, and chat.

Attendance self check-in is included in the preview. The office connection switch is only a demo control; in WordPress, the server must verify office IP/VPN, nonce, logged-in user, and admin-configured time window before writing attendance or awarding on-time XP.

For the fuller integration plan, see `wordpress-integration.md`.

## Fixes Applied

- Removed hardcoded demo passwords from seeded users.
- Removed the exposed admin password hint.
- Made preview login ID-based only, with WordPress auth called out as the production path.
- Added rich-text sanitization for task descriptions and comments.
- Validated link and image URL protocols.
- Normalized newly created employees to `coins` and `rep`.
- Fixed leaderboard, reports, and CSV export references that used missing `pts` values.
- Prevented duplicate completion awards when moving tasks from an already-done column.
- Added attendance self check-in, admin attendance control, correction requests, and WordPress server-side verification notes.

