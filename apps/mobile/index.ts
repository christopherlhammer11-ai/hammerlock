import 'react-native-get-random-values';
import 'expo-standard-web-crypto';
import './src/polyfills/base64';

import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);
