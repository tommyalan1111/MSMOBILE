// core/config/networks.ts
import * as dotenv from 'dotenv';
dotenv.config();

export interface AssetConfig {
  symbol: string;
  name: string;
  type: 'coin' | 'token';
  network: 'evm' | 'evm-token' | 'tezos';
  rpcUrl?: string;
  apiUrl?: string;
  contractAddress?: string;
  address: string;
}

export const TARGET_ASSETS: AssetConfig[] = [
  {
    symbol: 'AVAX',
    name: 'AVAX',
    type: 'coin',
    network: 'evm',
    rpcUrl: process.env.RPC_AVAX || 'https://api.avax.network/ext/bc/C/rpc', // Public RPC chính thức của Avalanche
    address: process.env.WALLET_EVM || '',
  },
  {
    symbol: 'USDT',
    name: 'USDT (ERC20)',
    type: 'token',
    network: 'evm-token',
    rpcUrl: process.env.RPC_ETH || 'https://ethereum.publicnode.com', // PublicNode không cần API key
    contractAddress: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    address: process.env.WALLET_EVM || '',
  },
  {
    symbol: 'ETH',
    name: 'ETH (NATIVE)',
    type: 'coin',
    network: 'evm',
    rpcUrl: process.env.RPC_ETH || 'https://ethereum.publicnode.com', // PublicNode không cần API key
    address: process.env.WALLET_EVM || '',
  },
  {
    symbol: 'XTZ',
    name: 'XTZ (TEZOS)',
    type: 'coin',
    network: 'tezos',
    apiUrl: process.env.API_TEZOS || 'https://api.tzkt.io/v1/accounts/',
    address: process.env.WALLET_TEZOS || '',
  },
  {
    symbol: 'MATIC',
    name: 'MATIC (NATIVE)',
    type: 'coin',
    network: 'evm',
    rpcUrl: process.env.RPC_POLYGON || 'https://polygon-rpc.com', // Public RPC chính thức của Polygon
    address: process.env.WALLET_EVM || '',
  },
];