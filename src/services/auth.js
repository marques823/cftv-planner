import { supabase } from './supabase.js';

export class AuthService {
    constructor() {
        this.user = null;
    }

    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        this.user = session?.user || null;

        supabase.auth.onAuthStateChange((_event, session) => {
            this.user = session?.user || null;
            window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: this.user } }));
        });

        return this.user;
    }

    async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    }

    async signInWithEmail(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data.user;
    }

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
        return data.user;
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    getCurrentUser() {
        return this.user;
    }
}
