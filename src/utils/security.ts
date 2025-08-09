
// Security utilities for input validation and sanitization

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

// Input sanitization
export function sanitizeInput(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/data:/gi, ''); // Remove data: protocols
  
  if (maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  
  return sanitized;
}

// URL validation and sanitization
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new SecurityError('Invalid URL protocol. Only HTTP and HTTPS are allowed.');
    }
    return urlObj.toString();
  } catch {
    throw new SecurityError('Invalid URL format.');
  }
}

// Email validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// File upload validation
export function validateFile(file: File, options: {
  allowedTypes?: string[];
  maxSize?: number;
  allowedExtensions?: string[];
} = {}) {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  } = options;

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    throw new SecurityError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    throw new SecurityError(`File size too large. Maximum size is ${maxSizeMB}MB.`);
  }

  // Check file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new SecurityError(`Invalid file extension. Allowed extensions: ${allowedExtensions.join(', ')}`);
  }

  return true;
}

// Rate limiting helper (client-side basic implementation)
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  canAttempt(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }
}

export const rateLimiter = new RateLimiter();

// Content validation
export function validateContent(content: string, minLength: number = 1, maxLength: number = 5000): boolean {
  if (!content || typeof content !== 'string') {
    throw new SecurityError('Content must be a non-empty string.');
  }

  const trimmed = content.trim();
  if (trimmed.length < minLength) {
    throw new SecurityError(`Content must be at least ${minLength} characters long.`);
  }

  if (trimmed.length > maxLength) {
    throw new SecurityError(`Content must be no more than ${maxLength} characters long.`);
  }

  return true;
}

// HTML entity encoding to prevent XSS
export function encodeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Decode HTML entities
export function decodeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

// SQL injection prevention - basic character filtering
export function preventSqlInjection(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments
    .replace(/\*\//g, '');
}

// Check for suspicious patterns
export function containsSuspiciousContent(input: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /onclick=/i,
    /data:.*base64/i,
    /eval\(/i,
    /expression\(/i
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}
