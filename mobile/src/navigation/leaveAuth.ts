// Leave the sign-in / sign-up / verify screens after the user is signed in.
// A seller whose store isn't approved yet gets a different set of screens
// (the seller application), which the navigator switches to by itself - so
// there's nowhere to go back to and nothing to navigate.
export function leaveAuth(navigation: any, mode: 'back' | 'top' = 'back') {
  const state = navigation.getState?.();
  if (!state?.routeNames?.includes('Main')) return;
  if (navigation.canGoBack()) {
    if (mode === 'top') navigation.popToTop();
    else navigation.goBack();
  } else {
    navigation.navigate('Main');
  }
}
