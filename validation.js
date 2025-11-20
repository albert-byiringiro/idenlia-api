/**
 * Utiliity functions using single responsibility principle 
 */ 


const validators = {
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email)
    },

    isValidPassword(password){
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasMinLength = password.length >= minLength;

        return {
            isValid: hasUpperCase && hasLowerCase && hasNumber && hasMinLength,
            errors: {
                minLength: !hasMinLength ? `Password must be at least ${minLength} characters` : null,
                uppercase: !hasUpperCase ? `Password must contain at least one upper case` : null,
                lowercase: !hasLowerCase ? `Password must contain at least one lower case` : null,
                number: !hasNumber ? `Password must contain at least one number` : null,
            }
        }
    },

    isValidName(name) {
        const trimmed = name?.trim();
        const minLength = 2;
        const maxLength = 50;
        const hasValidChars = /^[a-zA-Z\s'-]+$/.test(trimmed);
        
        if (!trimmed || trimmed.length < minLength) {
        return { isValid: false, error: `Name must be at least ${minLength} characters` };
        }
        
        if (trimmed.length > maxLength) {
        return { isValid: false, error: `Name cannot exceed ${maxLength} characters` };
        }
        
        if (!hasValidChars) {
        return { isValid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
        }
        
        return { isValid: true, error: null };
    },
}