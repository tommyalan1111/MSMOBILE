// core/blockchain/rpc.ts
import { AssetConfig } from '../config/networks';

export async function getOnChainBalance(asset: AssetConfig): Promise<number> {
  // A. Xử lý mạng EVM Coin hoặc Token
  if (asset.network === 'evm' || asset.network === 'evm-token') {
    if (!asset.rpcUrl || !asset.address) {
      throw new Error(`Thiếu rpcUrl hoặc address cho ${asset.symbol}`);
    }

    let lastError = '';
    
    // Thử gọi RPC lấy số dư
    try {
      let balanceRaw = '0';

      // 1. Nếu là Coin (ETH, AVAX, MATIC...) dùng eth_getBalance
      if (asset.type === 'coin') {
        const res = await fetch(asset.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [asset.address, 'latest'],
            id: 1,
          }),
        });
        const data = await res.json();
        if (data?.result) {
          balanceRaw = BigInt(data.result).toString();
          return Number(balanceRaw) / 1e18; // Quy đổi từ Wei sang Coin
        }
      }

      // 2. Nếu là Token (USDT...) dùng eth_call với balanceOf và decimals
      if (asset.type === 'token' && asset.contractAddress) {
        // Gọi balanceOf(address) -> 0x70a08231 + padded address
        const paddedAddress = asset.address.replace('0x', '').padStart(64, '0');
        const balancePayload = `0x70a08231${paddedAddress}`;

        const resBalance = await fetch(asset.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [{ to: asset.contractAddress, data: balancePayload }, 'latest'],
            id: 1,
          }),
        });
        const balanceData = await resBalance.json();
        if (!balanceData?.result || balanceData.result === '0x') {
          return 0;
        }
        balanceRaw = BigInt(balanceData.result).toString();

        // Lấy decimals() của token -> 0x313ce567
        let decimals = 6; // Mặc định USDT thường là 6
        try {
          const decimalsPayload = '0x313ce567';
          const resDecimals = await fetch(asset.rpcUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{ to: asset.contractAddress, data: decimalsPayload }, 'latest'],
              id: 2,
            }),
          });
          const decimalsData = await resDecimals.json();
          if (decimalsData?.result && decimalsData.result !== '0x') {
            decimals = Number(BigInt(decimalsData.result));
          }
        } catch {
          // Giữ giá trị fallback nếu contract không có phương thức decimals() public
        }
        return Number(balanceRaw) / Math.pow(10, decimals);
      }
    } catch (err: any) {
      lastError = err?.message || String(err);
    }
    throw new Error(`❌ RPC ERC20 error cho ${asset.symbol}: ${lastError}`);
  } 

  // B. Tezos (XTZ)
  if (asset.network === 'tezos' && asset.apiUrl) {
    try {
      const res = await fetch(`${asset.apiUrl}${asset.address}`);
      if (!res.ok) throw new Error(`Tezos API HTTP Status ${res.status}`);
      const data = await res.json();
      return (data?.balance || 0) / 1e6;
    } catch (err: any) {
      throw new Error(`❌ Tezos API error cho ${asset.symbol}: ${err?.message || String(err)}`);
    }
  }

  throw new Error(`Cấu hình tài sản không hợp lệ cho ${asset.symbol}`);
}