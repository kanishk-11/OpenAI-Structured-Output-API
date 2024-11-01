# Compliance Check API Using OpenAI Structured Output
A web-based API service built and designed to analyze and validate website content for compliance with specific policies, using OpenAI's latest structured output feature.

# Components

- **Structured Output from OpenAI**
- **Jina AI** - Intermediary to fetch content from external URLs, enabling efficient access to target webpage content for analysis.
- **Node.js and Express**

## Features

- **URL Content Fetching**: Fetches webpage content from a target URL, cleans HTML tags, and removes specified links.
- **Compliance Analysis**: Uses OpenAI's structured data extraction capabilities to analyze content for adherence to compliance policies.
- **Error Handling**: Provides error handling for timeouts, invalid URLs, and oversized content.
- **JSON API Response**: Returns a structured JSON response with analysis details for easy integration with other applications.

## Getting Started

### Prerequisites

- Node.js and npm installed on your local environment.
- Access to the OpenAI API with an API key.
- [Stripe Treasury Compliance Guidelines](https://stripe.com/docs/treasury/marketing-treasury) as a reference for compliance policies.

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/compliance-content-analyzer.git
    cd compliance-content-analyzer
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Configure environment variables in a `.env` file or modify directly in the code:

    - **PORT**: Port number for the server to run.
    - **OPENAI_API_KEY**: Your OpenAI API key for accessing the analysis API.
    - **COMPLIANCE_POLICIES_URL**: URL of the compliance policies document.

### Running the Server

To start the server, use:

```bash
node index.js
```

## API Endpoints

### `GET /webpage/:url`

Fetches and analyzes the compliance of content from the specified URL.

- **Parameters**:
  - `url` (Path Param): The URL of the webpage to fetch and analyze.
- **Response**:
  - `200 OK`: JSON object containing the structured compliance analysis.
  - `400 Bad Request`: Error when URL is invalid.
  - `413 Payload Too Large`: Error if content exceeds size limit (5MB).
  - `504 Gateway Timeout`: Error if request takes longer than the set timeout (30s).
  - `500 Internal Server Error`: General error for unexpected issues.

### Example Request

```bash
curl http://localhost:8080/webpage/example.com
```

### Example Response

```json
{
    "url": "example.com",
    "analysis": {
        "structured_content": [
            "logical statements from URL content"
        ],
        "compliance_analysis": {
            "compliant": ["list of compliant policies"],
            "non_compliant": ["list of non-compliant policies"]
        }
    }
}
```

## Code Overview

- **`isValidUrl()`**: Validates the URL format.
- **`cleanTextContent()`**: Cleans HTML content, removing links and extra whitespace.
- **`fetchCompliancePolicies()`**: Fetches and processes the compliance document.
- **`analyzeWebpageContent()`**: Uses OpenAI to analyze the content for compliance with guidelines.
- **`createRequestOptions()`**: Sets up request options for API calls.
- **Error Handling Functions**: Handles various error cases (timeouts, oversized responses, invalid URLs).

## Error Handling

The server includes error handling for:
- **Timeouts**: If content fetching or compliance analysis exceeds the set timeout.
- **Oversized Responses**: If the content exceeds the 5MB limit.
- **Invalid URLs**: If the provided URL format is incorrect.

## Testing Notes

Some URLs, such as this one - (https://stripe.com/docs/treasury/marketing-treasury), are protected against scraping or web crawling by firewalls. To test the API, a hardcoded set of policies and instructions on how to test it are provided in the comments at the bottom of the code.


## Acknowledgments

- [OpenAI](https://openai.com/) for the content analysis API.
- [Stripe Treasury Compliance Documentation](https://stripe.com/docs/treasury/marketing-treasury) for compliance guidelines.
