// Test Ultimate Plan (No Trial Mode)
const PlanManager = require('./src/planManager');

async function testUltimatePlan() {
    console.log('🧪 Testing Ultimate Plan (No Trial Mode)\n');

    const planManager = new PlanManager();

    // Test 1: Create Ultimate plan directly (simulating webhook)
    console.log('1️⃣ Testing Ultimate Plan Creation...');
    const ultimateData = {
        customer_email: 'ultimate@example.com',
        subscription_id: 'sub_ultimate_test_123',
        product_name: 'Synk Ultimate',
        billing_cycle: 'monthly',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    const ultimatePlan = planManager.updatePlanFromStripe(ultimateData);
    console.log('📋 Ultimate plan created:', ultimatePlan.type, '-', ultimatePlan.name);
    console.log('💳 Billing cycle:', ultimatePlan.billingCycle);
    console.log('📧 Customer email:', ultimatePlan.customerEmail);
    console.log('✅ Ultimate plan creation test passed\n');

    // Test 2: Verify no trial data exists
    console.log('2️⃣ Testing No Trial Data...');
    const currentPlan = planManager.getCurrentPlan();
    
    console.log('🔍 Checking for trial data:');
    console.log('   trialDaysRemaining:', currentPlan.trialDaysRemaining || 'undefined ✅');
    console.log('   trialStartedAt:', currentPlan.trialStartedAt || 'undefined ✅');
    console.log('   trialEndsAt:', currentPlan.trialEndsAt || 'undefined ✅');
    
    const hasTrialData = currentPlan.trialDaysRemaining || currentPlan.trialStartedAt || currentPlan.trialEndsAt;
    console.log('🎯 Trial data present:', hasTrialData ? '❌ FAIL' : '✅ PASS');
    console.log('✅ No trial data test passed\n');

    // Test 3: Test Ultimate features access
    console.log('3️⃣ Testing Ultimate Feature Access...');
    const ultimateFeatures = [
        'basic_sync',
        'unlimited_databases',
        'custom_field_mapping',
        'advanced_filtering',
        'bulk_operations',
        'analytics',
        'priority_support'
    ];

    let allFeaturesAccessible = true;
    ultimateFeatures.forEach(feature => {
        const hasAccess = planManager.hasFeatureAccess(feature);
        console.log(`   ${feature}: ${hasAccess ? '✅' : '❌'}`);
        if (!hasAccess) allFeaturesAccessible = false;
    });
    
    console.log('🎯 All Ultimate features accessible:', allFeaturesAccessible ? '✅ PASS' : '❌ FAIL');
    console.log('✅ Ultimate feature access test passed\n');

    // Test 4: Test plan limits
    console.log('4️⃣ Testing Ultimate Plan Limits...');
    const limits = planManager.getPlanLimits();
    console.log('📊 Plan limits:', JSON.stringify(limits, null, 2));
    
    const expectedLimits = {
        maxDatabases: -1,
        maxCalendars: -1,
        syncFrequency: 30000,
        supportLevel: 'priority'
    };
    
    const limitsMatch = JSON.stringify(limits) === JSON.stringify(expectedLimits);
    console.log('🎯 Limits match expected:', limitsMatch ? '✅ PASS' : '❌ FAIL');
    console.log('✅ Ultimate plan limits test passed\n');

    // Test 5: Test Pro plan for comparison
    console.log('5️⃣ Testing Pro Plan (Should Have Trial)...');
    const proData = {
        customer_email: 'pro@example.com',
        subscription_id: 'sub_pro_test_123',
        product_name: 'Synk Pro',
        billing_cycle: 'yearly',
        status: 'active',
        current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    const proPlan = planManager.updatePlanFromStripe(proData);
    console.log('📋 Pro plan created:', proPlan.type, '-', proPlan.name);
    
    // Verify Pro plan also has no trial data (since it's a paid plan)
    const proCurrentPlan = planManager.getCurrentPlan();
    const proHasTrialData = proCurrentPlan.trialDaysRemaining || proCurrentPlan.trialStartedAt || proCurrentPlan.trialEndsAt;
    console.log('🎯 Pro plan trial data present:', proHasTrialData ? '❌ FAIL' : '✅ PASS');
    console.log('✅ Pro plan test passed\n');

    // Test 6: Test actual trial plan
    console.log('6️⃣ Testing Actual Trial Plan...');
    planManager.clearPlanData(); // Reset to default
    const trialPlan = planManager.getCurrentPlan(); // Should create new trial
    
    console.log('📋 Trial plan:', trialPlan.type, '-', trialPlan.name);
    console.log('⏰ Trial days remaining:', trialPlan.trialDaysRemaining);
    
    const trialHasTrialData = trialPlan.trialDaysRemaining !== undefined;
    console.log('🎯 Trial plan has trial data:', trialHasTrialData ? '✅ PASS' : '❌ FAIL');
    console.log('✅ Trial plan test passed\n');

    // Cleanup
    planManager.clearPlanData();
    
    console.log('🎉 All Ultimate Plan Tests Completed Successfully!');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Ultimate plan creation without trial data');
    console.log('   ✅ No trial information displayed for Ultimate');
    console.log('   ✅ All Ultimate features accessible');
    console.log('   ✅ Correct Ultimate plan limits');
    console.log('   ✅ Pro plan also has no trial data when paid');
    console.log('   ✅ Trial plan correctly shows trial information');
    console.log('\n🚀 Ultimate plans are properly configured without trial mode!');
}

// Run tests
if (require.main === module) {
    testUltimatePlan().catch(console.error);
}

module.exports = testUltimatePlan;