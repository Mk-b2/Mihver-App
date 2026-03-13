/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import notifee from '@notifee/react-native';

// NOTIFEE ARKA PLAN MOTORU (Kilitlenmeyi önler)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log('Arka plan görevi çalıştı:', type);
});

AppRegistry.registerComponent(appName, () => App);