import { simpleFacebook, simpleInstagram } from '@ng-icons/simple-icons';

export const BRAND = {
  name: 'Iara Gouveia',
  logoPath: 'brand/iara-gouveia-lockup-v3.svg',
  markPath: 'brand/iara-gouveia-mark.svg',
  faviconPath: 'brand/iara-gouveia-favicon.svg',
} as const;

export const SOCIAL_LINKS = [
  {
    platform: 'Instagram',
    handle: '@iaragouveia.pt',
    url: 'https://www.instagram.com/iaragouveia.pt/',
    icon: simpleInstagram,
  },
  {
    platform: 'Facebook',
    handle: 'Facebook',
    url: 'https://www.facebook.com/share/1Eb265wqbs/?mibextid=wwXIfr',
    icon: simpleFacebook,
  },
] as const;
