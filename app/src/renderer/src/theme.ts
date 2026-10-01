import { createThemeController } from '@questline/ui';

/** The app's theme; follows the OS until the Settings UI calls `theme.set()`. */
export const theme = createThemeController();
