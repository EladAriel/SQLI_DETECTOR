// N8N Demo Test Script for LangChain RAG SQL Injection Detection

const axios = require('axios');

// Configuration
const config = {
    n8nBaseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
    ragApiUrl: process.env.RAG_API_URL || 'http://localhost:3002',
    detectionApiUrl: process.env.DETECTION_API_URL || 'http://localhost:3001',
    timeout: 30000
};

// Test queries with expected results
const testQueries = [
    {
        name: "Classic SQL Injection",
        query: "SELECT * FROM users WHERE id = '1' OR '1'='1'",
        expectedVulnerable: true,
        expectedRisk: "HIGH",
        description: "Classic OR-based SQL injection with always-true condition"
    },
    {
        name: "Union-based SQL Injection",
        query: "SELECT name FROM products WHERE id = 1 UNION SELECT password FROM users",
        expectedVulnerable: true,
        expectedRisk: "HIGH",
        description: "Union-based SQL injection to extract password data"
    },
    {
        name: "Comment-based SQL Injection",
        query: "UPDATE users SET password = 'hacked' WHERE 1=1; --",
        expectedVulnerable: true,
        expectedRisk: "HIGH",
        description: "SQL injection using comment to ignore rest of query"
    },
    {
        name: "Safe Parameterized Query",
        query: "SELECT name FROM products WHERE category = 'electronics'",
        expectedVulnerable: false,
        expectedRisk: "NONE",
        description: "Safe query with properly quoted string literal"
    },
    {
        name: "Safe Query with Numbers",
        query: "SELECT COUNT(*) FROM orders WHERE customer_id = 12345",
        expectedVulnerable: false,
        expectedRisk: "NONE",
        description: "Safe query using numeric parameter"
    },
    {
        name: "Complex Safe Query",
        query: "SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.customer_id WHERE o.date >= '2023-01-01'",
        expectedVulnerable: false,
        expectedRisk: "NONE",
        description: "Complex but safe join query with date parameter"
    }
];

// Utility functions
const log = {
    info: (msg) => console.log(`ℹ️  ${msg}`),
    success: (msg) => console.log(`✅ ${msg}`),
    warning: (msg) => console.log(`⚠️  ${msg}`),
    error: (msg) => console.log(`❌ ${msg}`),
    test: (msg) => console.log(`🧪 ${msg}`)
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check if services are running
async function checkServices() {
    log.info('Checking required services...');

    const services = [
        { name: 'N8N', url: `${config.n8nBaseUrl}` },
        { name: 'RAG API', url: `${config.ragApiUrl}/health` },
        { name: 'Detection API', url: `${config.detectionApiUrl}/health` }
    ];

    for (const service of services) {
        try {
            await axios.get(service.url, { timeout: 5000 });
            log.success(`${service.name} is running`);
        } catch (error) {
            log.error(`${service.name} is not accessible at ${service.url}`);
            log.error(`Please ensure ${service.name} is running before testing`);
            return false;
        }
    }

    return true;
}

// Test individual workflow endpoint
async function testWorkflowEndpoint(endpoint, payload, testCase) {
    try {
        log.test(`Testing: ${testCase.name}`);
        log.info(`Query: ${testCase.query}`);

        const startTime = Date.now();
        const response = await axios.post(endpoint, payload, {
            timeout: config.timeout,
            headers: { 'Content-Type': 'application/json' }
        });
        const endTime = Date.now();

        const duration = endTime - startTime;
        log.info(`Response time: ${duration}ms`);

        // Validate response structure
        if (!response.data) {
            log.error('No response data received');
            return { success: false, error: 'No response data' };
        }

        // Check for basic response structure
        const hasVulnerabilityAssessment = response.data.vulnerability_assessment ||
            response.data.demo_results?.vulnerability_detected !== undefined;

        if (!hasVulnerabilityAssessment) {
            log.warning('Response missing vulnerability assessment');
        }

        // Extract vulnerability information
        let isVulnerable, riskLevel;

        if (response.data.vulnerability_assessment) {
            // Main workflow response
            isVulnerable = response.data.vulnerability_assessment.is_vulnerable;
            riskLevel = response.data.vulnerability_assessment.risk_level;
        } else if (response.data.demo_results) {
            // Demo workflow response
            isVulnerable = response.data.demo_results.vulnerability_detected;
            riskLevel = response.data.demo_results.analysis_summary?.risk_assessment?.includes('HIGH') ? 'HIGH' :
                response.data.demo_results.analysis_summary?.risk_assessment?.includes('MEDIUM') ? 'MEDIUM' : 'LOW';
        }

        // Validate results
        const vulnerabilityMatch = isVulnerable === testCase.expectedVulnerable;
        const riskMatch = !testCase.expectedVulnerable || riskLevel === testCase.expectedRisk;

        if (vulnerabilityMatch && riskMatch) {
            log.success(`Test passed: Vulnerability=${isVulnerable}, Risk=${riskLevel}`);
        } else {
            log.warning(`Test result mismatch:`);
            log.warning(`  Expected: Vulnerable=${testCase.expectedVulnerable}, Risk=${testCase.expectedRisk}`);
            log.warning(`  Actual: Vulnerable=${isVulnerable}, Risk=${riskLevel}`);
        }

        return {
            success: true,
            response: response.data,
            duration,
            vulnerabilityMatch,
            riskMatch,
            isVulnerable,
            riskLevel
        };

    } catch (error) {
        log.error(`Test failed: ${error.message}`);
        if (error.response) {
            log.error(`Response status: ${error.response.status}`);
            log.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        return {
            success: false,
            error: error.message,
            statusCode: error.response?.status
        };
    }
}

// Test simple demo workflow
async function testSimpleDemo() {
    log.info('\n🎲 Testing Simple Demo Workflow...');

    const endpoint = `${config.n8nBaseUrl}/webhook/simple-demo`;
    const results = [];

    // Test with random query (empty payload)
    log.test('Testing with random demo query');
    const randomResult = await testWorkflowEndpoint(endpoint, {}, {
        name: 'Random Demo Query',
        query: 'Random',
        expectedVulnerable: null, // Unknown since it's random
        expectedRisk: null
    });
    results.push({ test: 'Random Query', ...randomResult });

    // Test with specific vulnerable query
    const vulnerableTest = testQueries[0]; // Classic SQL injection
    const vulnerableResult = await testWorkflowEndpoint(endpoint, {
        query: vulnerableTest.query
    }, vulnerableTest);
    results.push({ test: vulnerableTest.name, ...vulnerableResult });

    return results;
}

// Test main detection workflow  
async function testMainWorkflow() {
    log.info('\n🔍 Testing Main Detection Workflow...');

    const endpoint = `${config.n8nBaseUrl}/webhook/sql-detection`;
    const results = [];

    for (const testCase of testQueries) {
        const payload = {
            query: testCase.query,
            max_sources: 3,
            include_scores: true,
            context_type: 'all'
        };

        const result = await testWorkflowEndpoint(endpoint, payload, testCase);
        results.push({ test: testCase.name, ...result });

        // Small delay between tests
        await delay(1000);
    }

    return results;
}

// Generate test report
function generateReport(simpleResults, mainResults) {
    log.info('\n📊 Test Report Summary');
    console.log('═'.repeat(80));

    // Simple Demo Results
    console.log('\n🎲 Simple Demo Workflow Results:');
    console.log('-'.repeat(40));

    simpleResults.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.test}: ${result.duration || 'N/A'}ms`);
        if (!result.success) {
            console.log(`   Error: ${result.error}`);
        }
    });

    // Main Workflow Results
    console.log('\n🔍 Main Detection Workflow Results:');
    console.log('-'.repeat(40));

    let totalTests = 0;
    let passedTests = 0;
    let vulnerabilityAccuracy = 0;
    let riskAccuracy = 0;

    mainResults.forEach(result => {
        totalTests++;
        const status = result.success ? '✅' : '❌';
        const accuracy = result.vulnerabilityMatch && result.riskMatch ? '✅' : '⚠️';

        console.log(`${status} ${accuracy} ${result.test}: ${result.duration || 'N/A'}ms`);

        if (result.success) {
            passedTests++;
            if (result.vulnerabilityMatch) vulnerabilityAccuracy++;
            if (result.riskMatch) riskAccuracy++;

            console.log(`   Result: Vulnerable=${result.isVulnerable}, Risk=${result.riskLevel}`);
        } else {
            console.log(`   Error: ${result.error}`);
        }
    });

    // Summary Statistics
    console.log('\n📈 Summary Statistics:');
    console.log('-'.repeat(40));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful Executions: ${passedTests}/${totalTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
    console.log(`Vulnerability Detection Accuracy: ${vulnerabilityAccuracy}/${totalTests} (${(vulnerabilityAccuracy / totalTests * 100).toFixed(1)}%)`);
    console.log(`Risk Assessment Accuracy: ${riskAccuracy}/${totalTests} (${(riskAccuracy / totalTests * 100).toFixed(1)}%)`);

    // Performance metrics
    const successfulTests = mainResults.filter(r => r.success && r.duration);
    if (successfulTests.length > 0) {
        const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
        const minDuration = Math.min(...successfulTests.map(r => r.duration));
        const maxDuration = Math.max(...successfulTests.map(r => r.duration));

        console.log('\n⚡ Performance Metrics:');
        console.log('-'.repeat(40));
        console.log(`Average Response Time: ${avgDuration.toFixed(0)}ms`);
        console.log(`Fastest Response: ${minDuration}ms`);
        console.log(`Slowest Response: ${maxDuration}ms`);
    }

    console.log('\n' + '═'.repeat(80));
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting N8N LangChain RAG Demo Tests\n');

    // Check if services are running
    const servicesReady = await checkServices();
    if (!servicesReady) {
        log.error('Services not ready. Please start all required services before testing.');
        process.exit(1);
    }

    // Wait a moment for services to stabilize
    log.info('Waiting for services to stabilize...');
    await delay(2000);

    try {
        // Run tests
        const simpleResults = await testSimpleDemo();
        await delay(2000); // Brief pause between test suites

        const mainResults = await testMainWorkflow();

        // Generate report
        generateReport(simpleResults, mainResults);

        log.success('\n🎉 All tests completed!');

    } catch (error) {
        log.error(`Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

// Command line interface
if (require.main === module) {
    runAllTests().catch(error => {
        log.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    testSimpleDemo,
    testMainWorkflow,
    testQueries,
    config
};
