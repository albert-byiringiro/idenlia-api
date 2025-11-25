import { createValidator, validators } from "../utils/validation";

/**
 * Registration validation
 */
export const validateRegistration = createValidator({
    email: {
        required: true,
        validator: (value) => {
            if (!validators.isValidEmail(value)) {
                return { isValid: false, error: 'Invalid email format' };
            }
            return { isValid: true }
        }
    },
    password: {
        required: true,
        validator: validators.isValidPassword
    },
    name: {
        required: true,
        validator: validators.isValidName,
    }
})