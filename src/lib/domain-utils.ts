import { DomainMapping } from '@/types/tab';

const KNOWN_DOMAINS: DomainMapping = {
  // Major platforms
  'google.com': 'Google',
  'youtube.com': 'YouTube',
  'github.com': 'GitHub',
  'stackoverflow.com': 'Stack Overflow',
  'facebook.com': 'Facebook',
  'twitter.com': 'Twitter',
  'linkedin.com': 'LinkedIn',
  'reddit.com': 'Reddit',
  'amazon.com': 'Amazon',
  'netflix.com': 'Netflix',
  // Productivity & collaboration
  'notion.so': 'Notion',
  'figma.com': 'Figma',
  'slack.com': 'Slack',
  'discord.com': 'Discord',
  'linear.app': 'Linear',
  'trello.com': 'Trello',
  'asana.com': 'Asana',
  'clickup.com': 'ClickUp',
  'miro.com': 'Miro',
  'canva.com': 'Canva',
  // Dev tools
  'gitlab.com': 'GitLab',
  'bitbucket.org': 'Bitbucket',
  'vercel.com': 'Vercel',
  'netlify.com': 'Netlify',
  'heroku.com': 'Heroku',
  'replit.com': 'Replit',
  'codepen.io': 'CodePen',
  'codesandbox.io': 'CodeSandbox',
  // Communication
  'zoom.us': 'Zoom',
  'teams.microsoft.com': 'Microsoft Teams',
  'meet.google.com': 'Google Meet',
  'web.whatsapp.com': 'WhatsApp',
  'telegram.org': 'Telegram',
  // Media & content
  'medium.com': 'Medium',
  'dev.to': 'DEV Community',
  'twitch.tv': 'Twitch',
  'spotify.com': 'Spotify',
  'pinterest.com': 'Pinterest',
  'instagram.com': 'Instagram',
  // Cloud & storage
  'drive.google.com': 'Google Drive',
  'dropbox.com': 'Dropbox',
  'onedrive.live.com': 'OneDrive',
  'icloud.com': 'iCloud',
  // AI tools
  'chat.openai.com': 'ChatGPT',
  'claude.ai': 'Claude',
  'huggingface.co': 'Hugging Face',
};

export function normalizeHostname(urlOrHostname: string): string {
  try {
    const hostname = urlOrHostname.includes('://')
      ? new URL(urlOrHostname).hostname
      : urlOrHostname;
    return hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return urlOrHostname.replace(/^www\./i, '').toLowerCase();
  }
}

export function getDomainGroupName(hostname: string): string {
  const normalized = normalizeHostname(hostname);

  if (KNOWN_DOMAINS[normalized]) {
    return KNOWN_DOMAINS[normalized];
  }

  const parts = normalized.split('.');
  const main = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  return main.charAt(0).toUpperCase() + main.slice(1);
}

/** @deprecated Use getDomainGroupName instead */
export function prettifyDomain(domain: string): string {
  return getDomainGroupName(domain);
}

export function getHostnameKey(urlOrHostname: string): string {
  return normalizeHostname(urlOrHostname);
}

export function isApexHostname(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return normalized.split('.').length <= 2;
}

function getSubdomainPrefix(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  if (isApexHostname(normalized)) return null;

  const parts = normalized.split('.');
  return parts.slice(0, -2).join('.');
}

function prettifySubdomainPrefix(prefix: string): string {
  return prefix
    .split('.')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export function getSubGroupLabel(hostname: string, _groupName: string): string {
  const normalized = normalizeHostname(hostname);

  if (isApexHostname(normalized)) {
    return 'Root';
  }

  if (KNOWN_DOMAINS[normalized]) {
    return KNOWN_DOMAINS[normalized];
  }

  const prefix = getSubdomainPrefix(normalized);
  if (!prefix) return 'Root';

  return prettifySubdomainPrefix(prefix);
}

export function getSubGroupSortKey(label: string): string {
  if (label === 'Root') return '0';
  return `1_${label.toLowerCase()}`;
}
