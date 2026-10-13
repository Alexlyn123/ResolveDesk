const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @returns {Record<string, string>} field -> message; empty when valid */
export function validateLogin({ email, password }) {
    const errors = {};

    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';

    if (!password) errors.password = 'Enter your password.';

    return errors;
}

export function validatePassword(password) {
    if (!password) return 'Choose a password.';
    if (password.length < 8) return 'Use at least 8 characters.';
    if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'Include at least one letter and one number.';

    return null;
}

export function validateRegistration({ name, email, password, password_confirmation: confirmation }) {
    const errors = {};

    if (name.trim().length < 2) errors.name = 'Enter your full name.';

    if (!email.trim()) errors.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';

    const passwordError = validatePassword(password);
    if (passwordError) errors.password = passwordError;

    if (!confirmation) errors.password_confirmation = 'Confirm your password.';
    else if (confirmation !== password) errors.password_confirmation = 'The passwords do not match.';

    return errors;
}
