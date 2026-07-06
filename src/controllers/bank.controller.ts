import { Request, Response } from 'express';
import nombaService from '../services/nomba.service.js';

export const getBanks = async (req: Request, res: Response): Promise<any> => {
  try {
    const data = await nombaService.getBanks();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error fetching banks:', error);
    return res.status(500).json({ error: 'Failed to fetch banks' });
  }
};

export const lookupAccount = async (req: Request, res: Response): Promise<any> => {
  try {
    const { accountNumber, bankCode } = req.body;
    
    if (!accountNumber || !bankCode) {
      return res.status(400).json({ error: 'accountNumber and bankCode are required' });
    }

    const data = await nombaService.lookupAccount(accountNumber, bankCode);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error looking up account:', error);
    return res.status(500).json({ error: 'Failed to look up account' });
  }
};
