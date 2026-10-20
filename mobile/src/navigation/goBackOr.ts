// "Back" that always goes somewhere: if there's nothing to go back to (the
// screen was opened from a link, or the account just switched screens), go
// to the main tabs instead of failing.
export function goBackOr(navigation: any, fallback = 'Main') {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  const names: string[] = navigation.getState?.()?.routeNames ?? [];
  if (names.includes(fallback)) navigation.reset({ index: 0, routes: [{ name: fallback }] });
}
