
// Centralized input sanitization utilities

export class InputSanitizer {
  // Remove potentially dangerous characters and trim
  static sanitizeText(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>\"']/g, '') // Remove HTML/script injection chars
      .replace(/;/g, '') // Remove SQL injection chars
      .slice(0, 1000); // Limit length
  }

  // Sanitize email input
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .trim()
      .toLowerCase()
      .replace(/[<>\"']/g, '')
      .slice(0, 254); // RFC 5321 limit
  }

  // Sanitize search query
  static sanitizeSearchQuery(query: string): string {
    if (!query) return '';
    
    return query
      .trim()
      .replace(/[<>\"']/g, '')
      .replace(/;/g, '')
      .slice(0, 100);
  }

  // Sanitize URL input
  static sanitizeUrl(url: string): string {
    if (!url) return '';
    
    // Only allow http and https URLs
    const urlPattern = /^https?:\/\/.+/i;
    const sanitized = url.trim().slice(0, 500);
    
    if (!urlPattern.test(sanitized)) {
      return '';
    }
    
    return sanitized;
  }

  // Validate and sanitize file names
  static sanitizeFileName(fileName: string): string {
    if (!fileName) return '';
    
    return fileName
      .trim()
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid file name chars
      .slice(0, 255);
  }

  // Rate limiting helper - simple in-memory store for demo
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();

  static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (record.count >= maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
}

// Validation helpers
export class InputValidator {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  static isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }

  static isStrongPassword(password: string): boolean {
    // At least 8 chars, 1 uppercase, 1 lowercase, 1 number
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }
}
