/**
 * Utiliity functions using single responsibility principle 
 */ 


export const validators = {
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

    /**
     * Sanitize input (prevent XSS) 
     */
    sanitizeInput(input){
        if (typeof input !== 'string') return input

        return input
            .trim()
            .replace(/[<>]/g, '')
            .slice(0, 1000)
    }
};

/**
 * Validation middleware factory using factory pattern 
 */

export const createValidator = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            // check if required
            if (rules.required && !value) {
                errors.push({
                    field,
                    message: rules.message || `${field} is required`
                });
                continue;
            }

            // skip validation if filed is optional and not provided
            if (!rules.required && !value) continue;

            // Run custom validator
            if (rules.validator) {
                const result = rules.validator(value);
                if(!result.isValid) {
                    errors.push({
                        field,
                        message: result.error || rules.message
                    })
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'validation failed',
                errors
            });
        }

        // Sanitize all string inputs
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = validators.sanitizeInput(req.body[key])
            }            
        }

        next()
    }
}