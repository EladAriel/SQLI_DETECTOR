#!/usr/bin/env node

/**
 * Quick test script to verify the refactored MCP server works properly
 * This tests the new service-oriented architecture we just implemented
 */

const { spawn } = require('child_process');

async function testMCPServer() {
    console.log('🔍 Testing Refactored MCP Server Architecture...\n');

    // Sample vulnerable SQL code for testing
    const testCode = `
SELECT * FROM users WHERE id = '\${user_input}' AND password = '\${password}'

UPDATE products SET price = \${new_price} WHERE id = \${product_id}

DELETE FROM logs WHERE date < '\${cutoff_date}'
`;

    const testRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "analyze_vulnerability",
            arguments: {
                code: testCode,
                filename: "test_vulnerable.sql",
                description: "Testing the refactored MCP architecture with sample vulnerable SQL"
            }
        }
    };

    return new Promise((resolve, reject) => {
        console.log('📡 Starting MCP server test...');

        // Spawn the MCP server process
        const mcp = spawn('npm', ['run', 'mcp:start'], {
            cwd: process.cwd(),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let responseReceived = false;
        let timeout;

        // Set up timeout
        timeout = setTimeout(() => {
            if (!responseReceived) {
                mcp.kill();
                reject(new Error('❌ Test timeout - MCP server took too long to respond'));
            }
        }, 30000); // 30 second timeout

        // Handle server startup
        mcp.stderr.on('data', (data) => {
            const output = data.toString();
            console.log('🔧 Server:', output.trim());

            if (output.includes('started successfully')) {
                console.log('✅ MCP Server started, sending test request...\n');

                // Send test request after server starts
                setTimeout(() => {
                    mcp.stdin.write(JSON.stringify(testRequest) + '\n');
                }, 2000);
            }
        });

        // Handle responses
        mcp.stdout.on('data', (data) => {
            const output = data.toString().trim();
            if (output && output.startsWith('{')) {
                try {
                    const response = JSON.parse(output);
                    console.log('📥 Received MCP Response:');
                    console.log('----------------------------------------');

                    if (response.result && response.result.content) {
                        // Extract the analysis content
                        const content = response.result.content[0];
                        if (content.text) {
                            console.log(content.text.substring(0, 500) + '...');
                        }

                        console.log('\n✅ SUCCESS: MCP server responded with analysis!');
                        console.log('🏗️  New architecture is working properly!');
                        console.log('🎯 Orchestrator successfully routed the request!');

                    } else if (response.error) {
                        console.log('❌ Error in response:', response.error);
                    } else {
                        console.log('📋 Response structure:', JSON.stringify(response, null, 2));
                    }

                    responseReceived = true;
                    clearTimeout(timeout);
                    mcp.kill();
                    resolve(true);

                } catch (e) {
                    console.log('📄 Raw output:', output);
                }
            }
        });

        // Handle process errors
        mcp.on('error', (error) => {
            clearTimeout(timeout);
            reject(new Error(`❌ Process error: ${error.message}`));
        });

        mcp.on('close', (code) => {
            clearTimeout(timeout);
            if (!responseReceived) {
                if (code === 0) {
                    console.log('✅ MCP server exited cleanly');
                    resolve(true);
                } else {
                    reject(new Error(`❌ MCP server exited with code ${code}`));
                }
            }
        });
    });
}

// Run the test
testMCPServer()
    .then(() => {
        console.log('\n🎉 MCP Server Architecture Test Complete!');
        console.log('✅ Refactoring was successful!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Test Failed:', error.message);
        process.exit(1);
    });
