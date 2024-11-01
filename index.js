const express = require('express');
const https = require('https');
const { OpenAI } = require('openai');
const app = express();
const PORT = 8080;

// Initialize OpenAI client
const client = new OpenAI();

// Constants for request handling
const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
const REQUEST_TIMEOUT = 30000; // 30 seconds
const COMPLIANCE_POLICIES_URL = 'https://stripe.com/docs/treasury/marketing-treasury';

// URL validation function
const isValidUrl = (url) => {
    try {
        new URL(`https://${url}`);
        return true;
    } catch {
        return false;
    }
};

// Clean HTML content and extract text
function cleanTextContent(htmlContent) {
    // Remove any links and their text that start with 'https://'
    htmlContent = htmlContent.replace(/<a[^>]*href="https:\/\/[^"]*"[^>]*>(.*?)<\/a>/g, '');
    
    // Also remove any plain text starting with 'https://'
    htmlContent = htmlContent.replace(/\s*https:\/\/[^\s]*/g, '');
    
    // Remove other HTML tags
    htmlContent = htmlContent.replace(/<[^>]*>/g, ' ');

    // Clean up whitespace and hyphens
    return htmlContent.replace(/\s+/g, ' ')
        .replace(/-+/g, '')
        .trim();
}

async function fetchCompliancePolicies() {
    return new Promise((resolve, reject) => {
        const options = createRequestOptions(COMPLIANCE_POLICIES_URL);
        
        const request = https.get(options, response => {
            let data = '';
            let responseSize = 0;

            response.on('data', chunk => {
                responseSize += chunk.length;
                if (responseSize > MAX_SIZE) {
                    response.destroy();
                    reject(new Error('Compliance policies content exceeds maximum size'));
                    return;
                }
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const cleanedPolicies = cleanTextContent(data);
                    resolve(cleanedPolicies);
                } catch (error) {
                    reject(error);
                }
            });
        });

        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Timeout fetching compliance policies'));
        });

        request.on('error', error => {
            reject(error);
        });

        request.end();
    });
}

// Analyze content using OpenAI Structure Outputs
async function analyzeWebpageContent(content) {
    try {
        // First fetch the compliance policies
        const compliancePolicies = await fetchCompliancePolicies();

        const messages = [
            {
                "role": "system",
                "content": `
                You are an expert at structured data extraction. You will analyze two pieces of content:
                1. Compliance policies from Stripe's Treasury marketing guidelines
                2. Content from the provided URL
                
                Compliance Policies Content:
                ${compliancePolicies}
                
                URL Content to analyze:
                ${content}
                
                Respond in the following JSON format:
                {
                    "structured_content": [<array of logical statements extracted from URL content>],
                    "compliance_analysis": {
                        "compliant": [<array of followed policies>],
                        "non_compliant": [<array of policies not followed>]
                    }
                }
                `
            }
        ];

        const response = await client.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: messages,
            response_format: { "type": "json_object" }
        });

        return JSON.parse(response.choices[0].message.content);
    } catch (error) {
        console.error('Analysis Error:', error);
        throw error;
    }
}

app.get('/webpage/:url', async (req, res) => {
    const { url: targetUrl } = req.params;

    if (!isValidUrl(targetUrl)) {
        return sendErrorResponse(res, 400, 'Invalid URL format', 'Please provide a valid URL');
    }

    const options = createRequestOptions(targetUrl);

    const apiRequest = https.get(options, apiResponse => handleApiResponse(apiResponse, res, targetUrl));

    apiRequest.on('timeout', () => handleTimeout(apiRequest, res));
    apiRequest.on('error', error => handleError(error, res));

    apiRequest.end();
})

function sendErrorResponse(res, statusCode, error, message, details = '') {
    res.status(statusCode).json({ error, message, ...details && { details } });
}

function createRequestOptions(targetUrl) {
    return {
        hostname: 'r.jina.ai',
        path: `/https://${targetUrl}`,
        headers: {
            'Authorization': 'Bearer jina_45c5c89227b04b4fbe2dddef6d5474bcl7tWFdHMxRqyOnub0uv8fzp476oO' /* Public Facing API Key*/
        },
        timeout: REQUEST_TIMEOUT
    };
}

function handleApiResponse(apiResponse, res, targetUrl) {
    let data = '';
    let responseSize = 0;

    apiResponse.on('data', chunk => {
        responseSize += chunk.length;
        if (responseSize > MAX_SIZE) {
            apiResponse.destroy();
            return sendErrorResponse(res, 413, 'Response too large', 'The webpage content exceeds the maximum allowed size of 5MB');
        }
        data += chunk;
    });

    apiResponse.on('end', async () => {
        try {
            const cleanedText = cleanTextContent(data);
            const analysis = await analyzeWebpageContent(cleanedText);
            res.status(200).json({ url: targetUrl, analysis });
        } catch (error) {
            console.error('Error processing content:', error);
            sendErrorResponse(res, 500, 'Failed to process webpage content', '', error.message);
        }
    });
}

function handleTimeout(apiRequest, res) {
    apiRequest.destroy();
    sendErrorResponse(res, 504, 'Request timeout', `Request exceeded ${REQUEST_TIMEOUT / 3000} seconds timeout limit`);
}

function handleError(error, res) {
    console.error('Error making request:', error);
    sendErrorResponse(res, 500, 'Failed to fetch webpage content', '', error.message);
}

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred'
    });
});
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});






//Compliances Policies for example
// const COMPLIANCE_POLICIES = [
//     "Recommended Terms to use - Money management, or money management account or solution, Cash management, or cash management account or solution,Your brand, account, Financial services, Financial account, Financial product, Financial service product, Store of funds, Wallet or open loop wallet, Stored-value account, Open-Loop stored-value account, Prepaid access account, Eligible for FDIC “pass-through” insurance, Funds held at [Partner Bank], Member FDIC",
//     "Terms to Avoid - Stripe or [Your Brand] bank, Bank account, Bank balance, Banking, Banking account, Banking product, Banking platform, Deposits, Mobile banking, [Your Brand] pays interest, [Your Brand] sets interest rates, [Your Brand] advances funds, Phrases that suggest your users receive banking products or services directly from bank partners, for example: Create a [Bank Partner] bank account/A better way to bank with [Bank Partner]/Mobile banking with [Bank Partner]",
//     "Yield Compliance Recommended Terms - Always refer to yield as “yield”, Always disclose prominently in your marketing materials that the yield percentage is subject to change and the conditions under which it might change, Notify your existing customers whenever the yield percentage has changed, Prominently display the most recent yield percentage in their Dashboard",
//     "Yield Compliance Terms to avoid - Never refer to yield as “interest”, Don’t reference the Fed Funds Rate as a benchmark for setting your yield percentage, Don’t imply that the yield is pass-through interest from a bank partner.",
//     "FDIC Insurance Eligibility - Stripe Treasury balances are stored value accounts that are held “for the benefit of” our Stripe Treasury users with our bank partners, Evolve Bank & Trust and Goldman Sachs Bank USA. We disclose to you which of our partners hold your funds. For FDIC insurance to apply to a user’s balance in a “for the benefit of” account, we must satisfy the rules for FDIC pass-through deposit insurance, unlike a bank account directly with an FDIC insured bank.We understand that FDIC insurance eligibility can be a valuable feature to your customers. Stripe has approved the variations of the phrase “FDIC Insurance eligible” noted below on marketing materials, as long as certain conditions are met. Specifically, the statement of FDIC insurance eligibility must always be paired with two disclosures: (1). Stripe Treasury Accounts are eligible for FDIC pass-through deposit insurance if they meet certain requirements. The accounts are eligible only to the extent pass-through insurance is permitted by the rules and regulations of the FDIC, and if the requirements for pass-through insurance are satisfied. The FDIC insurance applies up to 250,000 USD per depositor, per financial institution, for deposits held in the same ownership capacity. (2).You must also disclose that neither Stripe nor you are an FDIC insured institution and that the FDIC’s deposit insurance coverage only protects against the failure of an FDIC insured depository institution.",
//     "The following terms that have the term 'eligible' are approved - “Eligible for FDIC insurance, FDIC insurance-eligible accounts, Eligible for FDIC pass-through insurance, Eligible for FDIC insurance up to the standard maximum deposit insurance per depositor in the same capacity, Eligible for FDIC insurance up to $250K",
//     "Dont use the following terms - FDIC insured, FDIC insured accounts, FDIC pass-through insurance guaranteed, Must protect user data, Must have clear refund policy"
// ];

//Replace ${compliancePolicies} on line 98 with ${COMPLIANCE_POLICIES.join('\n')}