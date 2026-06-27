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
    this.baseUrl = 'https://sandbox.nomba.com/v1'; 
    
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
}

const nombaService = new NombaService();
export default nombaService;
