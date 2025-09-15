// Stripe Webhook Setup Helper
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupWebhooks() {
    console.log('🔗 Synk Stripe Webhook Setup Helper\n');
    
    console.log('This script will help you configure Stripe webhooks for automatic plan management.\n');
    
    // Step 1: Get webhook secret
    console.log('📋 Step 1: Stripe Webhook Secret');
    console.log('1. Go to https://dashboard.stripe.com/webhooks');
    console.log('2. Create a new webhook endpoint');
    console.log('3. Copy the webhook signing secret (starts with whsec_)\n');
    
    const webhookSecret = await question('Enter your Stripe webhook secret: ');
    
    if (!webhookSecret.startsWith('whsec_')) {
        console.log('⚠️ Warning: Webhook secret should start with "whsec_"');
    }
    
    // Step 2: Choose deployment method
    console.log('\n📡 Step 2: Webhook Endpoint Setup');
    console.log('Choose your deployment method:');
    console.log('1. Local testing with ngrok');
    console.log('2. Cloud deployment (Render/Heroku/etc.)');
    console.log('3. Custom domain');
    
    const deployMethod = await question('\nEnter your choice (1-3): ');
    
    let webhookUrl = '';
    
    switch (deployMethod) {
        case '1':
            console.log('\n🔧 Local Testing Setup:');
            console.log('1. Install ngrok: npm install -g ngrok');
            console.log('2. Start Synk app: npm start');
            console.log('3. In another terminal: ngrok http 3001');
            console.log('4. Copy the ngrok URL and add /webhook/stripe');
            webhookUrl = await question('\nEnter your ngrok URL (e.g., https://abc123.ngrok.io): ');
            webhookUrl = webhookUrl.replace(/\/$/, '') + '/webhook/stripe';
            break;
            
        case '2':
            webhookUrl = await question('\nEnter your cloud deployment URL (e.g., https://your-app.render.com): ');
            webhookUrl = webhookUrl.replace(/\/$/, '') + '/webhook/stripe';
            break;
            
        case '3':
            webhookUrl = await question('\nEnter your custom webhook URL: ');
            break;
            
        default:
            console.log('❌ Invalid choice. Exiting...');
            rl.close();
            return;
    }
    
    // Step 3: Update .env file
    console.log('\n💾 Step 3: Updating Configuration');
    
    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (error) {
        console.log('⚠️ .env file not found, creating new one...');
    }
    
    // Update webhook secret
    if (envContent.includes('STRIPE_WEBHOOK_SECRET=')) {
        envContent = envContent.replace(/STRIPE_WEBHOOK_SECRET=.*/, `STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    } else {
        envContent += `\nSTRIPE_WEBHOOK_SECRET=${webhookSecret}`;
    }
    
    // Ensure webhook port is set
    if (!envContent.includes('WEBHOOK_PORT=')) {
        envContent += '\nWEBHOOK_PORT=3001';
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated');
    
    // Step 4: Display Stripe configuration
    console.log('\n⚙️ Step 4: Stripe Dashboard Configuration');
    console.log('Configure your Stripe webhook with these settings:');
    console.log(`\n📡 Endpoint URL: ${webhookUrl}`);
    console.log('\n📋 Events to send:');
    console.log('   • checkout.session.completed');
    console.log('   • invoice.payment_succeeded');
    console.log('   • customer.subscription.created');
    console.log('   • customer.subscription.updated');
    console.log('   • customer.subscription.deleted');
    
    // Step 5: Test instructions
    console.log('\n🧪 Step 5: Testing');
    console.log('To test your webhook setup:');
    console.log('1. Start your Synk app: npm start');
    console.log('2. Make a test purchase using your Stripe payment links');
    console.log('3. Check the app logs for webhook events');
    console.log('4. Verify plan updates in the About tab');
    
    console.log('\n📞 Need Help?');
    console.log('• Check STRIPE_WEBHOOK_SETUP_GUIDE.md for detailed instructions');
    console.log('• Test webhook connectivity: curl -X POST ' + webhookUrl);
    console.log('• Monitor Stripe webhook logs in your dashboard');
    
    console.log('\n✅ Webhook setup complete!');
    console.log('Your Synk app is now ready to receive Stripe webhook events.');
    
    rl.close();
}

// Run setup
if (require.main === module) {
    setupWebhooks().catch(console.error);
}

module.exports = setupWebhooks;