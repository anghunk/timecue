import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nProvider } from 'react-aria-components';
import { OptionsApp } from './App';
import '../../styles/app.css';

createRoot(document.getElementById('root')!).render(<StrictMode><I18nProvider locale="zh-CN"><OptionsApp /></I18nProvider></StrictMode>);
