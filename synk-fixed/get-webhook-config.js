// Get Stripe Webhook Configuration Values
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function getWebhookConfig() {
    console.log('🔗 Stripe Webhook Configuration Generator\n');
    
    console.log('First, get your ngrok URL:');
    console.log('1. Start your Synk app: npm start');
    console.log('2. In another terminal: ngrok http 3001');
    console.log('3. Copy the https URL (e.g., https://abc123.ngrok.io)\n');
    
    const ngrokUrl = await question('Enter your ngrok URL (without /webhook/stripe): ');
    const cleanUrl = ngrokUrl.replace(/\/$/, ''); // Remove trailing slash
    const webhookUrl = cleanUrl + '/webhook/stripe';
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 STRIPE WEBHOOK CONFIGURATION VALUES');
    console.log('='.repeat(60));
    
    console.log('\n🏷️  DESTINATION NAME:');
    console.log('Synk Plan Management');
    
    console.log('\n🌐 ENDPOINT URL:');
    console.log(webhookUrl);
    
    console.log('\n📝 DESCRIPTION:');
    console.log('Webhook endpoint for Synk app to receive Stripe payment events and automatically update user subscription plans (trial, pro, ultimate). Handles checkout completion, subscription changes, and payment processing.');
    
    console.log('\n📡 EVENTS TO SELECT (8 events):');
    console.log('✅ checkout.session.completed');
    console.log('✅ checkout.session.async_payment_succeeded');
    console.log('✅ customer.subscription.created');
    console.log('✅ customer.subscription.updated');
    console.log('✅ customer.subscription.deleted');
    console.log('✅ invoice.payment_succeeded');
    console.log('✅ invoice.payment_failed');
    console.log('✅ customer.subscription.trial_will_end');
    
    console.log('\n⚙️  ADDITIONAL SETTINGS:');
    console.log('• API Version: 2023-10-16');
    console.log('• Enable webhook signing: ✅ Yes');
    console.log('• Enable automatic retries: ✅ Yes');
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 COPY-PASTE READY VALUES');
    console.log('='.repeat(60));
    
    console.log('\nDestination Name:');
    console.log('Synk Plan Management');
    
    console.log('\nEndpoint URL:');
    console.log(webhookUrl);
    
    console.log('\nDescription:');
    console.log('Webhook endpoint for Synk app to receive Stripe payment events and automatically update user subscription plans (trial, pro, ultimate). Handles checkout completion, subscription changes, and payment processing.');
    
    console.log('\n✅ Configuration complete! Use these values in your Stripe webhook setup.');
    
    rl.close();
}

// Run the configuration generator
if (require.main === module) {
    getWebhookConfig().catch(console.error);
}

module.exports = getWebhookConfig;