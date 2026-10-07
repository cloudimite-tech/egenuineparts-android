import { usePreventScreenCapture } from 'expo-screen-capture';

// Android: blocks screenshots and screen recording on this screen (and shows
// it blank in the recent-apps switcher). iOS doesn't allow apps to block
// screenshots, so there it has no effect.
export function useNoScreenshots(key: string) {
  usePreventScreenCapture(key);
}
