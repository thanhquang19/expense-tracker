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

const categories = [
    'Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Investment'
];

const paymentMethods = [
    'Cash', 'Bank Account', 'Credit Card', 'Savings', 'PayPal', 'Crypto Wallet'
];

async function seed() {
    console.log('Seeding database...');

    // 1. Seed Categories
    console.log('Inserting categories...');
    for (const cat of categories) {
        const { error } = await supabase
            .from('category')
            .upsert({ category: cat }, { onConflict: 'category' });
        if (error) console.error(`Error inserting ${cat}:`, error.message);
    }

    // 2. Seed Payment Methods
    console.log('Inserting payment methods...');
    for (const pm of paymentMethods) {
        const { error } = await supabase
            .from('payment_method')
            .upsert({ payment_method: pm }, { onConflict: 'payment_method' });
        if (error) console.error(`Error inserting ${pm}:`, error.message);
    }

    console.log('✅ Seeding complete!');
}

seed();
