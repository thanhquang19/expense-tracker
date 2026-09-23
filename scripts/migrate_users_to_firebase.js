// One-time migration: imports existing app users into Firebase Auth, preserving their
// current bcrypt password hash (no forced password reset), and links each Supabase
// `user` row to the new Firebase account via `firebase_uid`.
//
// Run manually, once, after:
//   1. Creating the Firebase project and enabling the Email/Password sign-in provider.
//   2. Running scripts/setup_firebase_auth_rls.sql (adds the firebase_uid column).
//
// Required environment variables (set these in your shell, do NOT commit them):
//   GOOGLE_APPLICATION_CREDENTIALS   Path to a Firebase service account JSON key file
//   NEXT_PUBLIC_SUPABASE_URL         Same value as in .env
//   SUPABASE_SERVICE_ROLE_KEY        Supabase service_role key (Project Settings > API)
//                                    NEVER use this key in the app itself - server/script only.
//
// Usage:
//   node scripts/migrate_users_to_firebase.js

const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');
const crypto = require('crypto');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

// Service role key bypasses RLS - required here since this script must read every
// user's password hash and write firebase_uid across all rows in one pass.
const supabase = createClient(supabaseUrl, serviceRoleKey);

admin.initializeApp({
    credential: admin.credential.applicationDefault()
});

async function migrate() {
    const { data: users, error } = await supabase
        .from('user')
        .select('id, user_name, user_email, password, firebase_uid')
        .is('firebase_uid', null);

    if (error) {
        console.error('Failed to load users:', error);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('No users need migration.');
        return;
    }

    const importRecords = users.map((u) => ({
        uid: crypto.randomUUID(),
        email: u.user_email,
        passwordHash: Buffer.from(u.password, 'utf8'),
        displayName: u.user_name
    }));

    const result = await admin.auth().importUsers(importRecords, {
        hash: { algorithm: 'BCRYPT' }
    });

    console.log(`Imported ${result.successCount} user(s), ${result.failureCount} failure(s).`);
    result.errors.forEach((e) => console.error(`  Row ${e.index} (${users[e.index].user_email}):`, e.error.message));

    for (let i = 0; i < users.length; i++) {
        const failed = result.errors.some((e) => e.index === i);
        if (failed) continue;

        const { error: updateError } = await supabase
            .from('user')
            .update({ firebase_uid: importRecords[i].uid })
            .eq('id', users[i].id);

        if (updateError) {
            console.error(`Failed to link firebase_uid for user ${users[i].id}:`, updateError.message);
        }
    }

    console.log('Done. Users can now log in with their existing email + password via Firebase.');
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
