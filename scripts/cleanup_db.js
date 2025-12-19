const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually since we're not in Next.js environment
const envPath = path.resolve(__dirname, '../.env.local');
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

async function cleanup() {
    console.log('Cleaning up unused payment methods...');

    // 1. Get all payment methods
    const { data: allMethods, error: fetchError } = await supabase
        .from('payment_method')
        .select('payment_method');

    if (fetchError) {
        console.error('Error fetching payment methods:', fetchError.message);
        return;
    }

    console.log(`Found ${allMethods.length} total payment methods.`);

    let deletedCount = 0;

    for (const pm of allMethods) {
        // 2. Check if usage exists in activity
        const { count, error: countError } = await supabase
            .from('activity')
            .select('*', { count: 'exact', head: true })
            .eq('payment_method', pm.payment_method);

        if (countError) {
            console.error(`Error checking usage for ${pm.payment_method}:`, countError.message);
            continue;
        }

        if (count === 0) {
            console.log(`Deleting unused payment method: ${pm.payment_method}`);
            const { error: deleteError } = await supabase
                .from('payment_method')
                .delete()
                .eq('payment_method', pm.payment_method);

            if (deleteError) {
                console.error(`Failed to delete ${pm.payment_method}:`, deleteError.message);
            } else {
                deletedCount++;
            }
        } else {
            console.log(`Keeping active payment method: ${pm.payment_method} (${count} activities)`);
        }
    }

    console.log(`\nCleanup complete. Removed ${deletedCount} unused payment methods.`);
}

cleanup();
