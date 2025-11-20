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
    }
}