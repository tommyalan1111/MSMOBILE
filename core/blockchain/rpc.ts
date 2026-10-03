// core/blockchain/rpc.ts
import { ethers } from 'ethers';

export async function getOnChainBalance(assetConfig: any): Promise<number> {
    // Nếu là Tezos thì kiểm tra apiUrl và address, ngược lại kiểm tra rpcUrl và address
    if (assetConfig.network === 'tezos') {
        if (!assetConfig.apiUrl || !assetConfig.address) {
            throw new Error(`Thiếu apiUrl hoặc address cho ${assetConfig.symbol}`);
        }
    } else {
        if (!assetConfig.rpcUrl || !assetConfig.address) {
            throw new Error(`Thiếu rpcUrl hoặc address cho ${assetConfig.symbol}`);
        }
    }

    try {
        // C. Xử lý Tezos (XTZ)
        if (assetConfig.network === 'tezos' && assetConfig.apiUrl) {
            const res = await fetch(`${assetConfig.apiUrl}${assetConfig.address}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
                }
            });

            if (!res.ok) {
                throw new Error(`Tezos API HTTP Status ${res.status}`);
            }

            const data = await res.json();
            return (data?.balance || 0) / 1e6;
        }

        const provider = new ethers.JsonRpcProvider(assetConfig.rpcUrl);

        // A. Xử lý Native Coin (ETH, MATIC...)
        if (assetConfig.type === 'coin') {
            const balanceWei = await provider.getBalance(assetConfig.address);
            return parseFloat(ethers.formatEther(balanceWei));
        }

        // B. Xử lý Token ERC-20 (USDT...)
        if (assetConfig.type === 'token' && assetConfig.contractAddress) {
            const erc20Abi = ["function balanceOf(address owner) view returns (uint256)"];
            const contract = new ethers.Contract(assetConfig.contractAddress, erc20Abi, provider);
            const balanceWei = await contract.balanceOf(assetConfig.address);
            return parseFloat(ethers.formatUnits(balanceWei, assetConfig.decimals || 6));
        }

        return 0; // Nếu không phải coin hay token, trả về 0
    } catch (error: any) {
        // 2. Bắt và phân loại lỗi RPC / hạ tầng mạng blockchain
        const errorMessage = error?.message || String(error);
        const errorCode = error?.code || '';

        if (
            errorCode === 'UNKNOWN_ERROR' ||
            errorMessage.includes('-32603') ||
            errorMessage.includes('Internal error') ||
            errorMessage.includes('timeout')
        ) {
            console.warn(`\n⚠️ [RPC REPORT WARNING] Mạng lưới '${assetConfig.symbol}' (${assetConfig.network}) đang gặp sự cố từ Node Provider (Mã lỗi: -32603 Internal Error). Lỗi này xuất phát từ hạ tầng blockchain, không phải lỗi code app hay test script!\n`);
        } else {
            console.error(`\n❌ [RPC ERROR] Lỗi khi gọi RPC cho ${assetConfig.symbol}: ${errorMessage}\n`);
        }

        // Ném lỗi tiếp để test suite nhận diện được case test bị fail do hạ tầng
        throw new Error(`❌ RPC error cho ${assetConfig.symbol}: ${errorMessage}`);
    }
}