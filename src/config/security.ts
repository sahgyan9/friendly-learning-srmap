
// Security configuration constants

export const SECURITY_CONFIG = {
  // File upload limits
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_IMAGE_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],

  // Input validation limits
  MAX_TITLE_LENGTH: 300,
  MAX_DESCRIPTION_LENGTH: 5000,
  MAX_COMMENT_LENGTH: 1000,
  MAX_BIO_LENGTH: 2000,
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_COUNT: 10,

  // Rate limiting
  RATE_LIMIT_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Content security
  FORBIDDEN_PATTERNS: [
    /<script/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+=/gi,
    /data:.*base64/gi,
    /eval\(/gi,
    /expression\(/gi
  ],

  // URL validation
  ALLOWED_PROTOCOLS: ['http:', 'https:'],

  // Password requirements (if implementing custom auth)
  MIN_PASSWORD_LENGTH: 6,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SYMBOLS: false,
} as const;

export type SecurityConfig = typeof SECURITY_CONFIG;
