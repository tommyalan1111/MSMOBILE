// test/pageobjects/wallet.page.ts
import { $ } from '@wdio/globals';
import { getOnChainBalance } from '../../core/blockchain/rpc';
import { TARGET_ASSETS } from '../../core/config/networks';

class WalletPage {
    // Locator các tab chuyển đổi
    get coinTab() { return $('//android.widget.TextView[@text="Coin"]'); }
    get tokenTab() { return $('//android.widget.TextView[@text="Token"]'); }

    /**
     * Chuyển đổi qua lại giữa tab Coin và Token dựa vào type của asset
     */
    async switchTab(type: 'coin' | 'token') {
        if (type === 'coin' || type === 'evm') {
            await this.coinTab.click();
        } else {
            await this.tokenTab.click();
        }
        // Dừng nhẹ 0.5s để UI kịp render animation đổi tab
        await browser.pause(500);
    }

    /**
     * Lấy locator số dư động dựa trên tên Symbol (VD: 'ETH', 'USDT', 'ADA'...)
     * Dựa theo UI: Cấu trúc item chứa tên symbol và số dư bên cạnh
     */
    async getAssetBalanceUI(symbol: string): Promise<number> {
        // XPath động tìm text số dư nằm cùng một thẻ chứa symbol đó
        const balanceElement = $(`//android.widget.TextView[@text="${symbol}"]/ancestor::*[contains(@class, "ViewGroup") or contains(@resource-id, "item")]//android.widget.TextView[contains(@text, ".")] | //android.widget.TextView[@text="${symbol}"]/..//following-sibling::*//android.widget.TextView`);
        
        // Hoặc XPath tối ưu theo cấu trúc text phổ biến trong React Native / Flutter / Native Android:
        // Tìm dòng chứa symbol, sau đó lấy số dư hiển thị ở phía bên phải
        const specificBalanceLocator = $(`(//android.widget.TextView[@text="${symbol}"]/../following-sibling::android.view.ViewGroup//android.widget.TextView)[1]`);
        
        let rawText = '';
        try {
            rawText = await specificBalanceLocator.getText();
        } catch {
            // Fallback nếu cấu trúc XPath khác, quét các text hiển thị
            const fallbackLocator = $(`//android.widget.TextView[@text="${symbol}"]/following-sibling::android.widget.TextView`);
            rawText = await fallbackLocator.getText();
        }

        // Làm sạch chuỗi (loại bỏ khoảng trắng, ký tự chữ nếu có)
        const cleanText = rawText.replace(/[^0-9.]/g, '');
        return parseFloat(cleanText) || 0;
    }

    /**
     * Hàm kiểm tra đồng bộ số dư hoàn chỉnh cho cả Coin và Token
     */
    async verifyBalanceSync(symbol: string) {
        // 1. Tìm cấu hình tài sản trong TARGET_ASSETS (từ core/config/networks.ts)
        const assetConfig = TARGET_ASSETS.find(asset => asset.symbol === symbol);
        if (!assetConfig) {
            throw new Error(`Không tìm thấy cấu hình cho tài sản: ${symbol}`);
        }

        // 2. Tự động chuyển đúng tab (Coin hoặc Token) dựa vào loại asset
        const targetTab = (assetConfig.type === 'token' || assetConfig.network === 'evm-token') ? 'token' : 'coin';
        await this.switchTab(targetTab);

        // 3. Lấy số dư thực tế từ Blockchain thông qua Core Logic cũ
        const onChainBalance = await getOnChainBalance(assetConfig);
        console.log(`🔗 [On-Chain] ${symbol}: ${onChainBalance}`);

        // 4. Lấy số dư hiển thị trên App di động qua Appium
        const uiBalance = await this.getAssetBalanceUI(symbol);
        console.log(`📱 [App UI] ${symbol}: ${uiBalance}`);

        // 5. So sánh sai số
        expect(uiBalance).toBeCloseTo(onChainBalance, 4);
    }
}

export default new WalletPage();