import { useState, useCallback } from 'react';
import { translations } from '../i18n/translations';

export const useI18n = () => {
  const [locale, setLocale] = useState(() => {
    // 获取浏览器语言设置
    const browserLang = navigator.language.toLowerCase();
    return browserLang.startsWith('zh') ? 'zh' : 'en';
  });

  const t = useCallback((key) => {
    const keys = key.split('.');
    let result = translations[locale];
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    return result;
  }, [locale]);

  const toggleLocale = useCallback(() => {
    setLocale(prev => prev === 'zh' ? 'en' : 'zh');
  }, []);

  return {
    t,
    locale,
    toggleLocale
  };
}; 