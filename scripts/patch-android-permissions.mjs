import { readFile, writeFile } from 'node:fs/promises';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let manifest = await readFile(manifestPath, 'utf8');

const permissions = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.MODIFY_AUDIO_SETTINGS',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.VIBRATE'
];

for (const permission of permissions) {
  const escaped = permission.replaceAll('.', '\\.');
  if (!new RegExp(`<uses-permission[^>]+android:name=["']${escaped}["']`).test(manifest)) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${permission}" />\n</manifest>`);
  }
}

// Camera hardware is optional: devices without a camera can still install WAYSS.
const features = [
  'android.hardware.camera',
  'android.hardware.camera.autofocus'
];
for (const feature of features) {
  const escaped = feature.replaceAll('.', '\\.');
  if (!new RegExp(`<uses-feature[^>]+android:name=["']${escaped}["']`).test(manifest)) {
    manifest = manifest.replace('</manifest>', `    <uses-feature android:name="${feature}" android:required="false" />\n</manifest>`);
  }
}

await writeFile(manifestPath, manifest);
console.log('WAYSS Android permissions added to', manifestPath);
