import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, authValue, renderApp } from '@/test/utils';
import { LoginPage } from './LoginPage';
import { RegisterPage } from './RegisterPage';

describe('LoginPage', () => {
    it('validates before contacting the server', async () => {
        const user = userEvent.setup();
        const { auth } = renderApp(<LoginPage />, { auth: authValue(null), route: '/login', path: '/login' });

        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByText('Enter your email address.')).toBeInTheDocument();
        expect(screen.getByText('Enter your password.')).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true');

        await user.type(screen.getByLabelText(/Email address/), 'not-an-email');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
        expect(auth.login).not.toHaveBeenCalled();
    });

    it('signs in and goes to the dashboard', async () => {
        const user = userEvent.setup();
        const auth = authValue(null);
        auth.login.mockResolvedValue({});
        renderApp(<LoginPage />, { auth, route: '/login', path: '/login' });

        await user.type(screen.getByLabelText(/Email address/), ' sam@example.com ');
        await user.type(screen.getByLabelText(/^Password/), 'Secret-pass1');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/dashboard'));
        expect(auth.login).toHaveBeenCalledWith({ email: 'sam@example.com', password: 'Secret-pass1', remember: false });
    });

    it('shows the server message for invalid credentials and lets the user retry', async () => {
        const user = userEvent.setup();
        const auth = authValue(null);
        auth.login.mockRejectedValue(apiError(422, 'Invalid.', { email: 'These credentials do not match our records.' }));
        renderApp(<LoginPage />, { auth, route: '/login', path: '/login' });

        await user.type(screen.getByLabelText(/Email address/), 'sam@example.com');
        await user.type(screen.getByLabelText(/^Password/), 'wrong');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('These credentials do not match our records.');
        expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
        expect(screen.getByTestId('location')).toHaveTextContent('/login');
    });

    it('explains network failures in plain language', async () => {
        const user = userEvent.setup();
        const auth = authValue(null);
        auth.login.mockRejectedValue(apiError(0, 'We could not reach the server. Check your connection and try again.'));
        renderApp(<LoginPage />, { auth, route: '/login', path: '/login' });

        await user.type(screen.getByLabelText(/Email address/), 'sam@example.com');
        await user.type(screen.getByLabelText(/^Password/), 'Secret-pass1');
        await user.click(screen.getByRole('button', { name: 'Sign in' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('We could not reach the server');
    });

    it('can reveal and hide the password', async () => {
        const user = userEvent.setup();
        renderApp(<LoginPage />, { auth: authValue(null), route: '/login', path: '/login' });

        const password = screen.getByLabelText(/^Password/);
        expect(password).toHaveAttribute('type', 'password');

        await user.click(screen.getByRole('button', { name: 'Show password' }));
        expect(password).toHaveAttribute('type', 'text');

        await user.click(screen.getByRole('button', { name: 'Hide password' }));
        expect(password).toHaveAttribute('type', 'password');
    });
});

describe('RegisterPage', () => {
    async function fill(user, overrides = {}) {
        const values = { name: 'Nia Santos', email: 'nia@example.com', password: 'Secret-pass1', confirmation: 'Secret-pass1', ...overrides };

        await user.type(screen.getByLabelText(/Full name/), values.name);
        await user.type(screen.getByLabelText(/Email address/), values.email);
        await user.type(screen.getByLabelText(/^Password/), values.password);
        await user.type(screen.getByLabelText(/Confirm password/), values.confirmation);
    }

    it('rejects weak and mismatched passwords locally', async () => {
        const user = userEvent.setup();
        const { auth } = renderApp(<RegisterPage />, { auth: authValue(null), route: '/register', path: '/register' });

        await fill(user, { password: 'short', confirmation: 'different' });
        await user.click(screen.getByRole('button', { name: 'Create account' }));

        expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument();
        expect(screen.getByText('The passwords do not match.')).toBeInTheDocument();
        expect(auth.register).not.toHaveBeenCalled();
    });

    it('sends only the account fields, never a role', async () => {
        const user = userEvent.setup();
        const auth = authValue(null);
        auth.register.mockResolvedValue({ current: null });
        renderApp(<RegisterPage />, { auth, route: '/register', path: '/register' });

        await fill(user);
        await user.click(screen.getByRole('button', { name: 'Create account' }));

        await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/welcome'));
        expect(auth.register).toHaveBeenCalledWith({
            name: 'Nia Santos',
            email: 'nia@example.com',
            password: 'Secret-pass1',
            password_confirmation: 'Secret-pass1',
            workspace_code: null,
        });
    });

    it('shows field errors returned by the server', async () => {
        const user = userEvent.setup();
        const auth = authValue(null);
        auth.register.mockRejectedValue(apiError(422, 'Invalid.', { email: 'An account with this email address already exists.' }));
        renderApp(<RegisterPage />, { auth, route: '/register', path: '/register' });

        await fill(user);
        await user.click(screen.getByRole('button', { name: 'Create account' }));

        expect(await screen.findByText('An account with this email address already exists.')).toBeInTheDocument();
        expect(screen.getByLabelText(/Email address/)).toHaveAttribute('aria-invalid', 'true');
    });
});
