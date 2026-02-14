import { encode, decode } from 'base-64';
import 'fast-text-encoding';

if (typeof global.btoa !== 'function') {
  global.btoa = encode as typeof global.btoa;
}

if (typeof global.atob !== 'function') {
  global.atob = decode as typeof global.atob;
}
