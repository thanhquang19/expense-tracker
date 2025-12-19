const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually since we're not in Next.js environment
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('Testing Supabase Connection...');
    console.log('URL:', supabaseUrl);

    // 1. Test Categories
    const { data: categories, error: catError } = await supabase
        .from('category')
        .select('*')
        .limit(5);

    if (catError) {
        console.error('❌ Error fetching categories:', catError.message);
    } else {
        console.log('✅ Categories found:', categories.length);
        if (categories.length > 0) console.log('   Sample:', categories[0]);
    }

    // 2. Test Payment Methods
    const { data: payments, error: payError } = await supabase
        .from('payment_method')
        .select('*')
        .select('*');

    if (payError) {
        console.error('❌ Error fetching payment_methods:', payError.message);
    } else {
        console.log('✅ Payment Methods found:', payments.length);
        if (payments.length > 0) {
            console.log('   Sample:', payments[0]);
            console.log('   Keys:', Object.keys(payments[0]));
        } else {
            console.log('   No payment methods found to verify schema.');
        }
    }

    // 3. Test Activities
    const { data: activities, error: actError } = await supabase
        .from('activity')
        .select('*')
        .limit(5);

    if (actError) {
        console.error('❌ Error fetching activities:', actError.message);
    } else {
        console.log('✅ Activities found:', activities.length);
        if (activities.length > 0) {
            console.log('   Activity Keys:', Object.keys(activities[0]));
            console.log('   Sample Activity:', activities[0]);
        }
    }

    // 4. Test User Table
    const { data: users, error: userError } = await supabase
        .from('user')
        .select('id, user_name, user_email');

    if (userError) {
        console.error('❌ Error fetching users:', userError.message);
    } else {
        console.log('✅ Users found:', users.length);
        console.table(users);
    }
}

verify();
