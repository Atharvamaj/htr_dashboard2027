// Form validation and error recovery utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface RegistrationData {
  full_name: string;
  grade: string;
  school_name: string;
  hackathons_attended: string;
  dietary_restrictions: string;
  school_name_other: string;
  dietary_restrictions_other: string;
}

/**
 * Validates registration form data
 */
export function validateRegistrationForm(data: RegistrationData): ValidationResult {
  const errors: string[] = [];

  // Required field validation
  if (!data.full_name?.trim()) {
    errors.push('Full name is required');
  } else if (data.full_name.trim().length > 35) {
    errors.push('Full name must be 35 characters or less');
  }

  if (!data.grade?.trim()) {
    errors.push('Grade is required');
  }

  if (!data.school_name?.trim()) {
    errors.push('School name is required');
  }

  if (data.school_name === 'other' && !data.school_name_other?.trim()) {
    errors.push('Please specify your school name');
  } else if (data.school_name === 'other' && data.school_name_other && data.school_name_other.trim().length > 40) {
    errors.push('School name must be 40 characters or less');
  }

  if (!data.hackathons_attended?.trim()) {
    errors.push('Number of hackathons attended is required');
  } else {
    const hackathonCount = parseInt(data.hackathons_attended);
    if (isNaN(hackathonCount) || hackathonCount < 0) {
      errors.push('Number of hackathons must be a valid positive number');
    }
  }

  if (!data.dietary_restrictions?.trim()) {
    errors.push('Dietary restrictions selection is required');
  }

  if (data.dietary_restrictions === 'other' && !data.dietary_restrictions_other?.trim()) {
    errors.push('Please specify your dietary restrictions');
  } else if (data.dietary_restrictions === 'other' && data.dietary_restrictions_other && data.dietary_restrictions_other.trim().length > 40) {
    errors.push('Dietary restrictions must be 40 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates team name
 */
export function validateTeamName(teamName: string): ValidationResult {
  const errors: string[] = [];

  if (!teamName?.trim()) {
    errors.push('Team name is required');
  } else if (teamName.trim().length > 15) {
    errors.push('Team name must be 15 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates invite emails
 */
export function validateInviteEmails(emails: string[]): ValidationResult {
  const errors: string[] = [];
  const validEmails = emails.filter(email => email.trim());

  if (validEmails.length === 0) {
    errors.push('Please enter at least one email address');
  }

  validEmails.forEach((email, index) => {
    if (!validateEmail(email.trim())) {
      errors.push(`Invalid email format at position ${index + 1}: ${email}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Retry utility for async operations
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * Safe localStorage operations
 */
export const safeStorage = {
  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      logger.warn(`Failed to save to localStorage (${key}):`, error);
      return false;
    }
  },

  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.warn(`Failed to read from localStorage (${key}):`, error);
      return null;
    }
  },

  removeItem: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.warn(`Failed to remove from localStorage (${key}):`, error);
      return false;
    }
  },

  setObject: (key: string, value: any): boolean => {
    try {
      const serialized = JSON.stringify(value);
      return safeStorage.setItem(key, serialized);
    } catch (error) {
      logger.warn(`Failed to serialize and save object (${key}):`, error);
      return false;
    }
  },

  getObject: <T = any>(key: string): T | null => {
    try {
      const item = safeStorage.getItem(key);
      if (!item) return null;
      return JSON.parse(item) as T;
    } catch (error) {
      logger.warn(`Failed to parse object from localStorage (${key}):`, error);
      return null;
    }
  }
};

/**
 * Debounce utility
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}