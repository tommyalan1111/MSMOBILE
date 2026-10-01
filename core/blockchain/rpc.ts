// core/blockchain/rpc.ts
import { ethers } from 'ethers';

export async function getOnChainBalance(assetConfig: any): Promise<number> {
    if (!assetConfig.rpcUrl || !assetConfig.address) {
        throw new Error(`Thiếu rpcUrl hoặc address cho ${assetConfig.symbol}`);
    }

    try {
        const provider = new ethers.JsonRpcProvider(assetConfig.rpcUrl);
        
        // A. Xử lý Native Coin (ETH, MATIC...)
        if (assetConfig.type === 'coin') {
            const balanceWei = await provider.getBalance(assetConfig.address);
            return parseFloat(ethers.formatEther(balanceWei));
        } 
        
        // B. Xử lý Token ERC-20 (USDT...)
        else if (assetConfig.type === 'token' && assetConfig.contractAddress) {
            const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];
            const contract = new ethers.Contract(assetConfig.contractAddress, erc20Abi, provider);
            const balanceWei = await contract.balanceOf(assetConfig.address);
            return parseFloat(ethers.formatUnits(balanceWei, assetConfig.decimals || 6));
        } 
        
        // C. Xử lý Tezos (XTZ)
        else if (assetConfig.network === 'tezos' && assetConfig.apiUrl) {
            const res = await fetch(`${assetConfig.apiUrl}${assetConfig.address}`);
            if (!res.ok) throw new Error(`Tezos API HTTP Status ${res.status}`);
            const data = await res.json();
            return (data?.balance || 0) / 1e6;
        }

        throw new Error(`Cấu hình tài sản không hợp lệ cho ${assetConfig.symbol}`);

    } catch (error: any) {
        const lastError = error?.message || String(error);
        console.error(`❌ Lỗi RPC cho ${assetConfig.symbol}:`, lastError);
        throw new Error(`❌ RPC error cho ${assetConfig.symbol}: ${lastError}`);
    }
}