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

async function debugInsert() {
    console.log('Attempting to insert into activity table...');

    const dummyActivity = {
        date: new Date().toISOString().split('T')[0],
        transaction: 'Debug Transaction',
        amount: 1.00,
        category: 'Food',
        transaction_flow: 'Outflow',
        payment_method: 'Cash',
        user_name: 'Debug User'
    };

    const { data, error } = await supabase
        .from('activity')
        .insert([dummyActivity])
        .select();

    if (error) {
        console.error('❌ Insert Failed!');
        console.error('Error Message:', error.message);
        console.error('Error Details:', error.details);
        console.error('Error Hint:', error.hint);
        console.error('Error Code:', error.code);
    } else {
        console.log('✅ Insert Successful!');
        console.log('Inserted Data:', data);
    }
}

debugInsert();
