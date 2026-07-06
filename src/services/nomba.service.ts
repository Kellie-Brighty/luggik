import axios from 'axios';

interface NombaAuthResponse {
  code: string;
  data: {
    access_token: string;
    expiresAt: string;
    [key: string]: any;
  };
}

class NombaService {
  private clientId: string;
  private clientSecret: string;
  private accountId: string;
  private baseUrl: string;
  private state: 'UNAUTHENTICATED' | 'HANDSHAKE_COMPLETE';
  private accessToken: string | null;
  private expiresAt: string | null;
  private refreshTimer: NodeJS.Timeout | null;

  constructor() {
    this.clientId = process.env.NOMBA_CLIENT_ID || '';
    this.clientSecret = process.env.NOMBA_CLIENT_SECRET || '';
    this.accountId = process.env.NOMBA_ACCOUNT_ID || '';
    this.baseUrl = 'https://api.nomba.com/v1'; 
    
    this.state = 'UNAUTHENTICATED';
    this.accessToken = null;
    this.expiresAt = null;
    this.refreshTimer = null;
  }

  async authenticate(): Promise<boolean> {
    console.log('Attempting Nomba Handshake...');
    
    try {
      const response = await axios.post<NombaAuthResponse>(`${this.baseUrl}/auth/token/issue`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/json',
          'accountId': this.accountId
        }
      });

      if (response.data && response.data.code === '00') {
        this.accessToken = response.data.data.access_token;
        this.expiresAt = response.data.data.expiresAt;
        this.state = 'HANDSHAKE_COMPLETE';
        console.log('Nomba Handshake SUCCESS. State:', this.state);
        console.log('Token Expiry Time:', this.expiresAt);
        
        this.scheduleTokenRefresh();
        
        return true;
      } else {
        console.error('Nomba Handshake FAILED: Unexpected response', response.data);
        return false;
      }
    } catch (error: any) {
      console.error('Nomba Handshake ERROR:', error.response ? error.response.data : error.message);
      return false;
    }
  }

  scheduleTokenRefresh() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // 2 hours and 55 minutes in milliseconds
    const refreshIntervalMs = (2 * 60 * 60 * 1000) + (55 * 60 * 1000);
    
    console.log('Scheduling next token refresh in 2 hours and 55 minutes...');
    
    this.refreshTimer = setTimeout(async () => {
      console.log('Token refresh timer triggered. Refreshing Nomba access token...');
      await this.authenticate();
    }, refreshIntervalMs);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  async createVirtualAccount(accountRef: string, accountName: string, currency: string = 'NGN'): Promise<any> {
    if (this.state === 'UNAUTHENTICATED' || !this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Failed to authenticate with Nomba');
    }

    try {
      const subAccountId = process.env.NOMBA_SUB_ACCOUNT_ID || 'e3b59182-b814-4d74-9ee6-f679c5f724ab';
      const response = await axios.post(`${this.baseUrl}/accounts/virtual/${subAccountId}`, {
        accountRef,
        accountName,
        currency,
        bvn: '1234567890'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'accountId': this.accountId,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data && response.data.code === '00') {
        return response.data.data;
      }
      throw new Error(`Virtual account generation failed: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      console.error('Nomba Virtual Account Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getVirtualAccountTransactions(virtualAccount: string): Promise<any[]> {
    if (this.state === 'UNAUTHENTICATED' || !this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Failed to authenticate with Nomba');
    }

    try {
      const today = new Date();
      today.setDate(today.getDate() + 1); // include tomorrow for safety
      const todayStr = today.toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const url = `${this.baseUrl}/transactions/virtual?virtual_account=${virtualAccount}&dateFrom=${yesterdayStr}&dateTo=${todayStr}`;
      
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'accountId': this.accountId,
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (response.data && response.data.code === '00') {
        return response.data.data.results || [];
      }
      throw new Error(`Failed to fetch transactions: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      console.error('Nomba Transactions Error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getBanks(): Promise<any> {
    if (this.state === 'UNAUTHENTICATED' || !this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Failed to authenticate with Nomba');
    }

    try {
      const response = await axios.get(`${this.baseUrl}/transfers/banks`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'accountId': this.accountId,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching banks from Nomba:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  async lookupAccount(accountNumber: string, bankCode: string): Promise<any> {
    if (this.state === 'UNAUTHENTICATED' || !this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Failed to authenticate with Nomba');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/transfers/bank/lookup`, {
        accountNumber,
        bankCode
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'accountId': this.accountId,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error looking up account from Nomba:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
  async transferToBank(amount: number, accountNumber: string, accountName: string, bankCode: string, merchantTxRef: string, narration: string, senderName: string = 'Luggik'): Promise<any> {
    if (this.state === 'UNAUTHENTICATED' || !this.accessToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) throw new Error('Failed to authenticate with Nomba');
    }

    try {
      const subAccountId = process.env.NOMBA_SUB_ACCOUNT_ID || 'e3b59182-b814-4d74-9ee6-f679c5f724ab';
      const response = await axios.post(`https://api.nomba.com/v2/transfers/bank/${subAccountId}`, {
        amount,
        accountNumber,
        accountName,
        bankCode,
        merchantTxRef,
        senderName,
        narration
      }, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'accountId': this.accountId,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error: any) {
      console.error('Error transferring to bank via Nomba:', error.response ? error.response.data : error.message);
      throw error;
    }
  }
}

export default new NombaService();
