/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import notifee from '@notifee/react-native';

// NOTIFEE ARKA PLAN MOTORU (Kilitlenmeyi önler)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Arka plan görevi çalıştı:', type);
});

// ÇÖZÜM BURADA: Android'in beklediği "main" ismini doğrudan verdik!
AppRegistry.registerComponent('main', () => App);