#!/usr/bin/env node
/**
 * EasyStaff Bot API Server
 * Based on FINAL_BOT.js - EXACT SAME CODE
 */

const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// QUEUE SYSTEM - Process one invoice at a time
const invoiceQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || invoiceQueue.length === 0) {
        return;
    }
    
    isProcessing = true;
    const { req, res, data } = invoiceQueue.shift();
    
    console.log('\n📊 QUEUE STATUS');
    console.log('========================================');
    console.log('Processing:', data.customerName);
    console.log('Remaining in queue:', invoiceQueue.length);
    console.log('========================================\n');
    
    try {
        const result = await createInvoiceWorkflow(data);
        res.json(result);
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        isProcessing = false;
        // Process next item in queue
        if (invoiceQueue.length > 0) {
            console.log('\n⏭️  Processing next invoice in queue...\n');
            setImmediate(processQueue);
        } else {
            console.log('\n✅ Queue empty - ready for new requests\n');
        }
    }
}

// CONFIG - Same as FINAL_BOT.js
const CONFIG = {
    freelancerId: '1f0bca3a-30e1-64ba-b2ff-65a9752ed764',
    baseUrl: 'https://invoice.easystaff.io'
};

const CREDENTIALS = {
    email: 'mohamed.fakhirfakhir@gmail.com',
    password: 'simohamed1997S'
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create customer - EXACT COPY from FINAL_BOT.js
 */
async function createCustomer(page, customerData) {
    console.log('\n========================================');
    console.log('STEP 1: CREATE CUSTOMER');
    console.log('========================================\n');
    
    console.log('📧 Email:', customerData.email);
    console.log('👤 Name:', customerData.name);
    console.log('');
    
    const customerUrl = `${CONFIG.baseUrl}/cust_log?freel_id=${CONFIG.freelancerId}`;
    await page.goto(customerUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    
    // Generate password
    const password = 'Pass' + Date.now() + '!';
    
    // Fill form
    await page.evaluate((data, password) => {
        const inputs = document.querySelectorAll('input');
        if (inputs[0]) {
            inputs[0].value = data.name;
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs[1]) {
            inputs[1].value = data.email;
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs[2]) {
            inputs[2].value = password;
            inputs[2].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[2].dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (inputs[3]) {
            inputs[3].value = password;
            inputs[3].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[3].dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        const select = document.querySelector('select');
        if (select) {
            const options = Array.from(select.options);
            const option = options.find(opt => opt.text === data.country);
            if (option) {
                select.value = option.value;
            } else {
                select.selectedIndex = 2;
            }
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (inputs[4]) {
            inputs[4].click(); // Terms checkbox
        }
    }, customerData, password);
    
    await sleep(1000);
    
    // Submit
    await page.evaluate(() => {
        const button = document.querySelector('button');
        if (button) button.click();
    });
    
    await sleep(5000);
    console.log('✅ Customer created!\n');
    
    return true;
}

/**
 * Create invoice - EXACT COPY from FINAL_BOT.js
 */
async function createInvoice(page, invoiceData, customerName) {
    console.log('========================================');
    console.log('STEP 3: CREATE INVOICE');
    console.log('========================================\n');
    
    await page.goto(CONFIG.baseUrl + '/home', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    
    // Click Create invoice
    console.log('📄 Opening invoice form...');
    await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const createBtn = buttons.find(btn => btn.textContent.trim().toLowerCase() === 'create invoice');
        if (createBtn) createBtn.click();
    });
    await sleep(3000);
    console.log('✅ Invoice form opened\n');
    
    // Select customer
    console.log('👤 Selecting customer...');
    await page.evaluate(() => {
        const customerField = document.querySelector('.baTtck');
        if (customerField) customerField.click();
    });
    await sleep(2000);
    
    await page.evaluate((name) => {
        const customerNames = document.querySelectorAll('.baTteaO');
        for (let nameEl of customerNames) {
            if (nameEl.textContent.trim() === name) {
                nameEl.click();
                return;
            }
        }
    }, customerName);
    await sleep(1500); // Reduced wait time
    console.log('✅ Customer selected\n');
    
    // Verify modal is still open
    const modalStillOpen = await page.evaluate(() => {
        const select = document.querySelector('select');
        const textarea = document.querySelector('textarea');
        return !!(select && textarea);
    });
    
    if (!modalStillOpen) {
        console.log('❌ Modal closed after selecting customer!');
        console.log('⚠️  Customer might not exist in the list yet. Waiting and retrying...');
        await sleep(3000);
        
        // Try opening form again
        await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const createBtn = buttons.find(btn => btn.textContent.trim().toLowerCase() === 'create invoice');
            if (createBtn) createBtn.click();
        });
        await sleep(2000);
        
        // Try selecting customer again
        await page.evaluate(() => {
            const customerField = document.querySelector('.baTtck');
            if (customerField) customerField.click();
        });
        await sleep(1500);
        
        await page.evaluate((name) => {
            const customerNames = document.querySelectorAll('.baTteaO');
            for (let nameEl of customerNames) {
                if (nameEl.textContent.trim() === name) {
                    nameEl.click();
                    return;
                }
            }
        }, customerName);
        await sleep(1500);
    }
    
    // Service
    console.log('🏷️  Selecting service...');
    await page.evaluate((serviceName) => {
        const select = document.querySelector('select');
        if (select) {
            const options = Array.from(select.options);
            const option = options.find(opt => opt.text === serviceName);
            if (option) select.value = option.value;
            else select.selectedIndex = 1;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }, invoiceData.serviceName);
    await sleep(1000);
    console.log('✅ Service selected\n');
    
    // Description
    console.log('📝 Filling description...');
    await page.evaluate((description) => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
            textarea.value = description;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }, invoiceData.description);
    await sleep(1000);
    console.log('✅ Description filled\n');
    
    // Amount
    console.log('💰 Filling amount...');
    await page.evaluate((amount) => {
        const inputs = document.querySelectorAll('input');
        for (let input of inputs) {
            if (input.placeholder && input.placeholder.includes('min 10')) {
                input.value = amount;
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
    }, invoiceData.amount);
    await sleep(2000);
    console.log('✅ Amount filled\n');
    
    // Currency
    console.log('💵 Selecting currency...');
    await page.evaluate((currency) => {
        if (currency === 'USD') {
            const usdImage = document.querySelector('.baTtdaS');
            if (usdImage) usdImage.click();
        }
    }, invoiceData.currency);
    await sleep(1000);
    console.log('✅ Currency selected\n');
    
    // Checkboxes
    console.log('☑️  Checking agreement checkboxes...');
    await page.evaluate(() => {
        const checkbox1 = document.querySelector('.baTtcaY');
        const checkbox2 = document.querySelector('.baTtcaS');
        if (checkbox1) checkbox1.click();
        if (checkbox2) checkbox2.click();
    });
    await sleep(3000); // Wait for Submit button to appear
    console.log('✅ Checkboxes checked\n');
    
    // Submit - Try multiple times if needed
    console.log('📤 Submitting invoice...');
    let submitSuccess = false;
    let attempts = 0;
    
    while (!submitSuccess && attempts < 3) {
        attempts++;
        
        const submitResult = await page.evaluate(() => {
            const allElements = Array.from(document.querySelectorAll('button, div, a'));
            for (let el of allElements) {
                if (el.offsetParent === null) continue;
                if (el.textContent.trim() === 'Submit') {
                    el.click();
                    return { clicked: true };
                }
            }
            return { clicked: false };
        });
        
        if (submitResult.clicked) {
            submitSuccess = true;
            console.log('✅ Submit clicked');
        } else {
            console.log(`⚠️  Submit button not found (attempt ${attempts}/3), waiting...`);
            await sleep(2000);
        }
    }
    
    if (!submitSuccess) {
        console.log('❌ Submit button not found after 3 attempts');
        return { success: false };
    }
    await sleep(3000);
    console.log('✅ Invoice submitted!\n');
    
    // Get invoice ID
    console.log('📋 Navigating to History...');
    await page.goto(CONFIG.baseUrl + '/history', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);
    
    // Click on first invoice
    const invoiceClicked = await page.evaluate(() => {
        const invoiceCards = document.querySelectorAll('.baTsaBaI');
        if (invoiceCards.length > 0) {
            invoiceCards[0].click();
            return true;
        }
        return false;
    });
    
    if (!invoiceClicked) {
        console.log('⚠️  No invoice found in history, waiting...');
        await sleep(3000);
        await page.reload();
        await sleep(2000);
        
        await page.evaluate(() => {
            const invoiceCards = document.querySelectorAll('.baTsaBaI');
            if (invoiceCards.length > 0) {
                invoiceCards[0].click();
            }
        });
    }
    
    await sleep(3000);
    
    // Extract invoice_id
    const invoicePageUrl = page.url();
    console.log('📍 Invoice page URL:', invoicePageUrl);
    
    let invoiceId = '';
    if (invoicePageUrl.includes('invoice_id=')) {
        invoiceId = invoicePageUrl.split('invoice_id=')[1].split('&')[0];
    }
    
    if (!invoiceId) {
        console.log('❌ Could not extract invoice ID from URL');
        return { success: false };
    }
    
    console.log('✅ Invoice ID:', invoiceId);
    
    // Construct payment link
    const paymentLink = `https://api.easystaff.io/api/rbk/cabinetfl/paylink?method=UNLIMIT&id=${invoiceId}`;
    
    return {
        success: true,
        invoiceId: invoiceId,
        invoiceUrl: invoicePageUrl,
        paymentLink: paymentLink
    };
}

/**
 * Login function - EXACT COPY from session_manager.js
 */
async function login(page) {
    console.log('🔐 Logging in...');
    
    await page.goto(CONFIG.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);
    
    const emailInput = await page.$('input[type="email"]');
    await emailInput.click();
    await emailInput.type(CREDENTIALS.email, { delay: 50 });
    await page.evaluate(() => {
        const email = document.querySelector('input[type="email"]');
        email.dispatchEvent(new Event('input', { bubbles: true }));
        email.dispatchEvent(new Event('change', { bubbles: true }));
        email.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    
    await sleep(500);
    
    const passwordInput = await page.$('input[type="password"]');
    await passwordInput.click();
    await passwordInput.type(CREDENTIALS.password, { delay: 50 });
    await page.evaluate(() => {
        const password = document.querySelector('input[type="password"]');
        password.dispatchEvent(new Event('input', { bubbles: true }));
        password.dispatchEvent(new Event('change', { bubbles: true }));
        password.dispatchEvent(new Event('blur', { bubbles: true }));
    });
    
    await sleep(1000);
    
    const loginButton = await page.$('button');
    await loginButton.click();
    
    await sleep(8000);
    
    const currentUrl = page.url();
    if (!currentUrl.includes('/home')) {
        throw new Error('Login failed! Not redirected to /home. URL: ' + currentUrl);
    }
    
    console.log('✅ Logged in successfully!');
    return true;
}

/**
 * Main workflow function - extracted from endpoint
 */
async function createInvoiceWorkflow(data) {
    const {
        customerName,
        customerEmail,
        customerCountry,
        amount,
        description
    } = data;
    
    let browser1, browser2;
    
    try {
        // STEP 1: Create customer (only if new)
        browser1 = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page1 = await browser1.newPage();
        
        // Try to create customer - if they exist, it will fail but that's OK
        try {
            await createCustomer(page1, {
                name: customerName,
                email: customerEmail,
                country: customerCountry || 'United States of America'
            });
        } catch (error) {
            console.log('⚠️  Customer might already exist, continuing...');
        }
        
        await browser1.close();
        
        // STEP 2: Login and create invoice
        console.log('========================================');
        console.log('STEP 2: LOGIN AS FREELANCER');
        console.log('========================================\n');
        
        browser2 = await puppeteer.launch({
            headless: true,
            executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--window-size=1920,1080',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page2 = await browser2.newPage();
        await page2.setViewport({ width: 1920, height: 1080 });
        
        await login(page2);
        
        const result = await createInvoice(page2, {
            serviceName: 'Web support, devices',
            description: 'Service payment for ' + customerName + ' - Amount: $' + amount,
            amount: amount,
            currency: 'USD'
        }, customerName);
        
        if (!result.success) {
            throw new Error('Invoice creation failed');
        }
        
        console.log('\n========================================');
        console.log('✅ SUCCESS!');
        console.log('========================================\n');
        console.log('Customer:', customerName);
        console.log('Email:', customerEmail);
        console.log('Amount:', amount, 'USD');
        console.log('');
        console.log('Invoice ID:', result.invoiceId);
        console.log('Invoice URL:', result.invoiceUrl);
        console.log('');
        console.log('💳 PAYMENT LINK:');
        console.log(result.paymentLink);
        console.log('');
        
        await sleep(3000);
        await browser2.close();
        
        return {
            success: true,
            invoiceId: result.invoiceId,
            invoiceUrl: result.invoiceUrl,
            paymentLink: result.paymentLink
        };
        
    } catch (error) {
        if (browser1) await browser1.close();
        if (browser2) await browser2.close();
        throw error;
    }
}

/**
 * API Endpoint - Adds requests to queue
 */
app.post('/create-invoice', async (req, res) => {
    console.log('\n🤖 EasyStaff Bot - Complete Workflow');
    console.log('======================================\n');
    
    const {
        customerName,
        customerEmail,
        customerCountry,
        amount,
        description
    } = req.body;
    
    console.log('📥 Request from WHMCS:');
    console.log('Customer:', customerName);
    console.log('Email:', customerEmail);
    console.log('Country:', customerCountry || 'NOT PROVIDED');
    console.log('Amount:', amount, 'USD\n');
    
    // Validate required fields
    if (!customerName || !customerEmail || !amount) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
            success: false,
            error: 'Missing required customer information'
        });
    }
    
    // Add to queue
    invoiceQueue.push({
        req,
        res,
        data: {
            customerName,
            customerEmail,
            customerCountry: customerCountry || 'United States of America',
            amount,
            description
        }
    });
    
    console.log('📋 Added to queue. Position:', invoiceQueue.length);
    console.log('Queue status: ' + (isProcessing ? 'BUSY' : 'READY') + '\n');
    
    // Start processing
    processQueue();
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'EasyStaff Bot API is running' });
});

app.listen(PORT, () => {
    console.log('🤖 EasyStaff Bot API Server (Based on FINAL_BOT.js)');
    console.log('========================================');
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log('========================================\n');
});
