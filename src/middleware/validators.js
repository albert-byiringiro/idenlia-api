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


/**
 * Login validation
 */
export const validateLogin = createValidator({
  email: {
    required: true,
    message: 'Email is required'
  },
  password: {
    required: true,
    message: 'Password is required'
  }
});

/**
 * Email validation
 */
export const validateEmail = createValidator({
  email: {
    required: true,
    validator: (value) => {
      if (!validators.isValidEmail(value)) {
        return { isValid: false, error: 'Invalid email format' };
      }
      return { isValid: true };
    }
  }
});

/**
 * Password reset validation
 */
export const validatePasswordReset = createValidator({
  token: {
    required: true,
    message: 'Reset token is required'
  },
  password: {
    required: true,
    validator: validators.isValidPassword
  }
});