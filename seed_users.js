const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedUser() {
    console.log('Seeding User...');

    // Try to insert the default user
    // Note: The table name might be 'users' or 'user'. The error said "Key is not present in table "user"."
    // So I will try 'user' first. If that fails, I'll try 'users'.
    // Also need to know the columns. Usually it's user_name, user_email based on mockData.ts

    const user = {
        user_name: 'John Doe',
        user_email: 'john@example.com'
    };

    // Try table 'users' first as it's more standard, but error said "user".
    // Actually, the error message `Key is not present in table "user".` strongly implies the table name is `user`.

    const { data, error } = await supabase
        .from('user')
        .upsert(user, { onConflict: 'user_name' })
        .select();

    if (error) {
        console.error('❌ Error inserting user into "user" table:', error.message);

        // Fallback: maybe the table is named 'users'?
        console.log('Trying "users" table...');
        const { data: data2, error: error2 } = await supabase
            .from('users')
            .upsert(user, { onConflict: 'user_name' })
            .select();

        if (error2) {
            console.error('❌ Error inserting user into "users" table:', error2.message);
        } else {
            console.log('✅ User inserted into "users" table:', data2);
        }

    } else {
        console.log('✅ User inserted into "user" table:', data);
    }
}

seedUser();
