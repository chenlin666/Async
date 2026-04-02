import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { APP_UI_STYLE, readPrefersDark, readStoredColorMode, resolveEffectiveScheme } from './colorMode';
import { I18nProvider } from './i18n';
import './index.css';
import './styles/tokens.css';
import './styles/theme-dark.css';
import './styles/theme-light.css';
import './styles/motion.css';
import './styles/mac-codex.css';

const initialScheme = resolveEffectiveScheme(readStoredColorMode(), readPrefersDark());
document.documentElement.setAttribute('data-ui-style', APP_UI_STYLE);
document.documentElement.setAttribute('data-color-scheme', initialScheme);

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<I18nProvider>
			<App />
		</I18nProvider>
	</StrictMode>
);
