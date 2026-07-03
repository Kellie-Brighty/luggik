import 'dotenv/config';

async function runNombaTest() {
  const accountId = process.env.NOMBA_ACCOUNT_ID;
  const clientId = process.env.NOMBA_CLIENT_ID;
  const clientSecret = process.env.NOMBA_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    console.error('Missing Nomba credentials in .env');
    return;
  }

  try {
    console.log('1. Authenticating with Nomba...');
    const authResponse = await fetch('https://api.nomba.com/v1/auth/token/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'accountId': accountId,
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    const authData = await authResponse.json();
    
    if (authData.code !== '00') {
      throw new Error(`Authentication failed: ${JSON.stringify(authData)}`);
    }

    const accessToken = authData.data.access_token;
    console.log('✅ Authentication successful! Access token obtained.\n');

    console.log('2. Generating dynamic virtual account for SUB-ACCOUNT...');
    const uniqueRef = `luggik-test-${Date.now()}`;
    const subAccountId = 'e3b59182-b814-4d74-9ee6-f679c5f724ab';
    
    const requestHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'accountId': accountId, // Must authenticate the request using the Parent Account ID!
    };

    console.log("\n--- SENDING REQUEST ---");
    console.log("URL:", `https://api.nomba.com/v1/accounts/virtual/${subAccountId}`);
    console.log("HEADERS:", JSON.stringify(requestHeaders, null, 2));
    console.log("-----------------------\n");

    const virtualAccountResponse = await fetch(`https://api.nomba.com/v1/accounts/virtual/${subAccountId}`, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify({
        accountRef: uniqueRef,
        accountName: 'Luggik Escrow Test',
        currency: 'NGN',
        bvn: '1234567890' // Added dummy BVN just in case the live API requires it
      }),
    });

    const virtualAccountData = await virtualAccountResponse.json();
    console.log("DEBUG FULL RESPONSE:", JSON.stringify(virtualAccountData, null, 2));

    if (virtualAccountData.code !== '00') {
      throw new Error(`Virtual account generation failed: ${JSON.stringify(virtualAccountData)}`);
    }

    const accountDetails = virtualAccountData.data;
    console.log('✅ Virtual Account Generated Successfully!\n');
    console.log('--- TRANSFER DETAILS ---');
    console.log(`Bank Name:      ${accountDetails.bankName}`);
    console.log(`Account Name:   ${accountDetails.bankAccountName}`);
    console.log(`Account Number: ${accountDetails.bankAccountNumber}`);
    console.log(`Reference:      ${accountDetails.accountRef}`);
    console.log('------------------------\n');
    console.log('You can now make a small transfer (e.g., 100 NGN) to this account from your bank app.');
    console.log('Keep an eye on your live server logs to see the webhook come in!');

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

runNombaTest();
