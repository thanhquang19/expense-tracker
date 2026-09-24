const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Seeds system-wide categories/payment methods (belong_to null). RLS only allows a row's
// owner to write it and system rows have no owner, so this needs SUPABASE_SERVICE_ROLE_KEY
// (bypasses RLS) rather than the anon key - run scripts/add_category_payment_method_ownership.sql
// directly in the Supabase SQL editor for the initial "Cash"/default category seeding instead.
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) envVars[key.trim()] = value.trim();
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const categories = [
    'Food', 'Transport', 'Shopping', 'Utilities', 'Entertainment', 'Health', 'Salary', 'Freelance', 'Investment'
];

const paymentMethods = [
    'Cash', 'Bank Account', 'Credit Card', 'Savings', 'PayPal', 'Crypto Wallet'
];

// System rows (belong_to null) are unique per lower(name) via a partial index, not a plain
// column constraint, so upsert's onConflict can't target it directly - check then insert instead.
async function seed() {
    console.log('Seeding database...');

    // 1. Seed Categories (system-wide: belong_to left null)
    console.log('Inserting categories...');
    for (const cat of categories) {
        const { data: existing } = await supabase
            .from('category')
            .select('id')
            .is('belong_to', null)
            .ilike('category', cat)
            .maybeSingle();
        if (existing) continue;
        const { error } = await supabase
            .from('category')
            .insert({ category: cat, belong_to: null });
        if (error) console.error(`Error inserting ${cat}:`, error.message);
    }

    // 2. Seed Payment Methods (system-wide: belong_to left null)
    console.log('Inserting payment methods...');
    for (const pm of paymentMethods) {
        const { data: existing } = await supabase
            .from('payment_method')
            .select('id')
            .is('belong_to', null)
            .ilike('payment_method', pm)
            .maybeSingle();
        if (existing) continue;
        const { error } = await supabase
            .from('payment_method')
            .insert({ payment_method: pm, belong_to: null });
        if (error) console.error(`Error inserting ${pm}:`, error.message);
    }

    console.log('✅ Seeding complete!');
}

seed();
