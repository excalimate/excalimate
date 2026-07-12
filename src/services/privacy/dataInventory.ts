export const PRIVACY_POLICY_URL = 'https://excalimate.com/privacy';
export const CONSENT_STORAGE_KEY = 'excalimate-analytics-consent';
export const CONSENT_SCHEMA_VERSION = '2.0';

export const OPTIONAL_STORAGE_KEYS = {
  theme: 'excalimate-theme',
  mcpUrl: 'excalimate-mcp-url',
  githubStars: 'excalimate-gh-stars',
} as const;

export const ANALYTICS_EVENT_DEFINITIONS = {
  animation_exported: {
    label: 'Animation exported',
    purpose: 'Understand which export formats need the most support.',
    properties: {
      format: 'One of: mp4, webm, gif, svg, lottie, dotlottie.',
    },
  },
  project_shared: {
    label: 'Project shared',
    purpose: 'Measure use of encrypted sharing.',
    properties: {},
  },
  project_created: {
    label: 'Project created',
    purpose: 'Understand common canvas formats.',
    properties: {
      aspect_ratio: 'One of: 16:9, 4:3, 1:1, 3:2.',
    },
  },
  project_saved: {
    label: 'Project saved',
    purpose: 'Measure use of local project saving.',
    properties: {},
  },
  project_loaded: {
    label: 'Project loaded',
    purpose: 'Understand how projects are reopened.',
    properties: {
      source: 'One of: file, checkpoint, share_url.',
    },
  },
  excalidraw_imported: {
    label: 'Excalidraw imported',
    purpose: 'Measure import workflows.',
    properties: {
      source: 'One of: file, url.',
    },
  },
  mode_switched: {
    label: 'Editor mode switched',
    purpose: 'Understand use of editing and animation modes.',
    properties: {
      mode: 'One of: edit, animate.',
    },
  },
  playback_action: {
    label: 'Playback action',
    purpose: 'Improve animation-preview controls.',
    properties: {
      action: 'One of: play, pause, stop.',
    },
  },
  keyframe_action: {
    label: 'Keyframe action',
    purpose: 'Improve keyframe editing.',
    properties: {
      action: 'One of: add, move, delete, update.',
    },
  },
  track_action: {
    label: 'Timeline track action',
    purpose: 'Improve timeline-track controls.',
    properties: {
      action: 'One of: add, remove, toggle.',
    },
  },
  sequence_action: {
    label: 'Sequence action',
    purpose: 'Improve sequence-reveal workflows.',
    properties: {
      action: 'One of: create, update, delete.',
    },
  },
  camera_action: {
    label: 'Camera action',
    purpose: 'Improve camera framing controls.',
    properties: {
      action: 'One of: change_aspect_ratio, fit_to_scene.',
      ratio: 'For aspect-ratio changes only; one of: 16:9, 4:3, 1:1, 3:2.',
    },
  },
  theme_toggled: {
    label: 'Theme changed',
    purpose: 'Understand light and dark theme use.',
    properties: {
      theme: 'One of: light, dark.',
    },
  },
  group_action: {
    label: 'Grouping action',
    purpose: 'Improve grouping workflows without recording project contents.',
    properties: {
      action: 'One of: group, ungroup.',
      element_count_bucket: 'One of: 1, 2-5, 6-20, 21+.',
    },
  },
  mcp_action: {
    label: 'MCP action',
    purpose: 'Improve optional MCP live-mode setup.',
    properties: {
      action: 'One of: connect, disconnect, set_url.',
    },
  },
  landing_page_viewed: {
    label: 'Landing page viewed',
    purpose: 'Understand which public documentation sections are useful.',
    properties: {
      page: 'A fixed public page category; never a full URL, query string, or hash.',
    },
  },
  landing_external_link_clicked: {
    label: 'Landing external link selected',
    purpose: 'Understand which public resources visitors choose to open.',
    properties: {
      destination: 'A fixed destination category; never link text or a full URL.',
    },
  },
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_DEFINITIONS;

export const POSTHOG_TECHNICAL_PROPERTIES = [
  'distinct_id',
  '$session_id',
  '$window_id',
  '$lib',
  '$lib_version',
  '$process_person_profile',
] as const;

export const DATA_PRACTICES = [
  {
    id: 'cloudflare-delivery',
    title: 'Service delivery and security',
    condition: 'Every request',
    data: 'Source IP address, requested host/path, HTTP method and headers, timestamp, response status, and transfer size are processed by Cloudflare to deliver and secure the service.',
    purpose: 'Deliver pages and app assets, prevent abuse, and maintain availability.',
    legalBasis: 'Legitimate interests in operating a secure and reliable service.',
    recipient: 'Cloudflare, acting primarily as hosting/CDN processor.',
    retention:
      'Cloudflare service-log retention follows the contracted service settings; Excalimate does not export these logs for analytics.',
  },
  {
    id: 'cloudflare-aggregate',
    title: 'Aggregate traffic statistics',
    condition: 'Every request; no client analytics beacon',
    data: 'Aggregate request counts, bandwidth, HTTP status/error counts, cache performance, and country-level traffic. Excalimate does not use IP-derived unique-visitor counts as anonymous analytics.',
    purpose: 'Capacity planning, reliability monitoring, and service improvement.',
    legalBasis: 'Legitimate interests; retained reports no longer identify a visitor.',
    recipient: 'Cloudflare edge/zone analytics.',
    retention:
      'Raw or exported reports: up to 30 days. Non-identifying aggregate trend reports: indefinitely.',
  },
  {
    id: 'posthog',
    title: 'Optional product analytics',
    condition: 'Only after analytics consent',
    data: 'Only the events and bounded properties listed in the event catalogue, plus a random in-memory session identifier, event timestamp, SDK name/version, and transient network metadata.',
    purpose: 'Understand feature use and prioritize product improvements.',
    legalBasis: 'Consent.',
    recipient: 'PostHog Cloud EU as processor. IP capture must be disabled in project settings.',
    retention: 'Up to 12 months.',
  },
  {
    id: 'github-stars',
    title: 'GitHub repository star count',
    condition: 'When the app toolbar loads',
    data: 'GitHub receives ordinary request network metadata such as IP address, User-Agent, and Origin. Excalimate requests only public repository metadata.',
    purpose: 'Display the public repository star count.',
    legalBasis: 'Legitimate interests, subject to the documented ePrivacy assessment.',
    recipient: 'GitHub.',
    retention:
      'Determined by GitHub for its network logs. A local one-hour cache is used only with preference-storage consent.',
  },
  {
    id: 'feedback-content',
    title: 'Public feedback portal',
    condition: 'When a visitor opens feedback details, submits feedback, comments, or votes',
    data: 'Submitted title, description, category, optional display name (or "Anonymous"), comment text, vote state, GitHub issue/comment numbers and timestamps, a random feedback-cookie UUID, and HMAC-derived author/vote tokens. Submitted text and display names are public. GitHub receives only the derived tokens, not the raw cookie UUID.',
    purpose:
      'Publish requested product feedback, attribute the chosen display name, show vote state, and prevent duplicate votes.',
    legalBasis:
      'Performance of the requested feedback service and legitimate interests in operating a public product-feedback channel.',
    recipient: 'Cloudflare Worker and GitHub as the public feedback repository host.',
    retention:
      'Public submissions, comments, and derived tokens remain until the corresponding GitHub issue or comment is deleted. The feedback identity cookie expires after one year.',
  },
  {
    id: 'feedback-security',
    title: 'Feedback abuse prevention',
    condition: 'When the feedback API handles a request',
    data: 'IP address used as a rate-limit key, request origin and headers, Turnstile response token, and a random verification idempotency UUID. The token and IP address are sent to Cloudflare Turnstile; Excalimate does not place them in an application database.',
    purpose: 'Prevent automated abuse, forged requests, spam, and excessive submissions.',
    legalBasis: 'Legitimate interests in protecting the service and public feedback channel.',
    recipient: 'Cloudflare Workers rate limiting and Cloudflare Turnstile.',
    retention:
      'Transient request and rate-limit processing; Cloudflare service logs follow the contracted service settings.',
  },
  {
    id: 'unpkg-runtime',
    title: 'dotLottie runtime',
    condition: 'When the landing home page loads its animation examples',
    data: 'unpkg/Cloudflare receives ordinary resource-request metadata such as IP address, User-Agent, requested pinned asset, and Origin. Referrer transmission is disabled.',
    purpose: 'Render the animation examples on the landing site.',
    legalBasis: 'Legitimate interests, subject to the documented ePrivacy assessment.',
    recipient: 'unpkg, delivered through Cloudflare.',
    retention: 'Determined by the recipient for its network logs.',
  },
  {
    id: 'encrypted-sharing',
    title: 'Encrypted project sharing',
    condition: 'Only when the user selects Share',
    data: 'An end-to-end encrypted project blob, random share ID, content length/type, and expiry timestamp. The encryption key remains in the URL hash and is not sent to the server.',
    purpose: 'Provide a user-requested share link.',
    legalBasis: 'Performance of the requested service.',
    recipient: 'Cloudflare Worker and R2.',
    retention: 'Up to 30 days.',
  },
  {
    id: 'mcp',
    title: 'MCP live connection',
    condition: 'Only when the user connects',
    data: 'The configured MCP endpoint receives the live-mode requests and scene updates needed for that connection.',
    purpose: 'Provide the user-requested MCP live workflow.',
    legalBasis: 'Performance of the requested service.',
    recipient: 'The MCP endpoint selected by the user.',
    retention:
      'Controlled by that endpoint; Excalimate does not centrally store the connection contents.',
  },
] as const;

export const BROWSER_STORAGE_ITEMS = [
  {
    key: CONSENT_STORAGE_KEY,
    contents: 'Versioned analytics and preference choices with a decision timestamp.',
    purpose: 'Remember privacy choices.',
    category: 'Required',
  },
  {
    key: 'excalimate_feedback_id',
    contents:
      'A random UUID and HMAC signature in a Secure, HttpOnly, SameSite=Lax cookie with a one-year expiry.',
    purpose: 'Remember feedback authorship and vote state and prevent duplicate votes.',
    category: 'Required only for feedback features',
  },
  {
    key: 'excalidraw-animate-autosave',
    contents: 'The current project and animation timeline.',
    purpose: 'Recover the locally edited project.',
    category: 'Required local app data',
  },
  {
    key: 'excalidraw-animate-recent',
    contents: 'Up to ten recent local projects.',
    purpose: 'Show the user their recent projects.',
    category: 'Required local app data',
  },
  {
    key: OPTIONAL_STORAGE_KEYS.theme,
    contents: 'light or dark.',
    purpose: 'Remember the selected theme.',
    category: 'Optional preference',
  },
  {
    key: OPTIONAL_STORAGE_KEYS.mcpUrl,
    contents: 'The MCP endpoint entered by the user.',
    purpose: 'Remember the optional live-mode endpoint.',
    category: 'Optional preference',
  },
  {
    key: OPTIONAL_STORAGE_KEYS.githubStars,
    contents: 'Public GitHub star count and one-hour cache timestamp.',
    purpose: 'Avoid repeated GitHub API requests.',
    category: 'Optional preference',
  },
] as const;

export const EXCLUDED_ANALYTICS_DATA = [
  'Names, email addresses, account identifiers, or advertising identifiers',
  'Diagram/project text, shapes, files, names, or encryption keys',
  'Full URLs, query strings, URL hashes, or referrers',
  'Typed input, clipboard contents, screenshots, or session replay',
  'Precise location, cross-site activity, or device fingerprints',
] as const;
