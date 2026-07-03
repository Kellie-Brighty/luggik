import 'dotenv/config';

async function checkVirtualAccount() {
  const accountId = process.env.NOMBA_ACCOUNT_ID;
  const clientId = process.env.NOMBA_CLIENT_ID;
  const clientSecret = process.env.NOMBA_CLIENT_SECRET;
  const virtualAccount = '3126737739';

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
    console.log('✅ Authentication successful!\n');

    console.log(`2. Checking transactions for Virtual Account: ${virtualAccount}...`);
    
    // Add date range to filter recent transactions as required by the endpoint docs
    const today = new Date();
    today.setDate(today.getDate() + 1); // include tomorrow for safe UTC boundary
    const todayStr = today.toISOString().split('T')[0];
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const url = `https://api.nomba.com/v1/transactions/virtual?virtual_account=${virtualAccount}&dateFrom=${yesterdayStr}&dateTo=${todayStr}`;
    
    console.log(`GET ${url}`);
    
    const checkResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'accountId': accountId,
      },
    });

    const checkData = await checkResponse.json();
    console.log('\n--- API RESPONSE ---');
    console.log(JSON.stringify(checkData, null, 2));
    console.log('--------------------\n');

  } catch (error) {
    console.error('Test Failed:', error);
  }
}

checkVirtualAccount();
