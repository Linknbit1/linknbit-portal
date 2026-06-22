export const MGMT_ROLES: readonly string[] = ['super_admin', 'admin', 'hr']
// HR can reach Settings to manage Designations; in-page section filtering hides
// Services and Permissions from HR (see SettingsPage).
export const SETTINGS_ROLES: readonly string[] = ['super_admin', 'admin', 'hr']
