// Extends app.json with Android App Links for share URLs, so
// https://<backend>/p/<id> and /s/<slug> can open the app directly.
// The host comes from EXPO_PUBLIC_API_URL in mobile/.env.
module.exports = ({ config }) => {
  const api = process.env.EXPO_PUBLIC_API_URL;
  const host = api && /^https:\/\//.test(api) ? new URL(api).host : null;
  const hosts = [host, 'genuineparts.lk', 'www.genuineparts.lk'].filter(Boolean);
  return {
    ...config,
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: hosts.flatMap((h) => [
            { scheme: 'https', host: h, pathPrefix: '/p/' },
            { scheme: 'https', host: h, pathPrefix: '/s/' },
          ]),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  };
};
