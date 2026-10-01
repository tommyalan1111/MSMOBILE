// test/pageobjects/wallet.page.ts
import { $ } from '@wdio/globals';
import { getOnChainBalance } from '../../core/blockchain/rpc';
import { TARGET_ASSETS } from '../../core/config/networks';

class WalletPage {
    // Locator bắt chuẩn nút tab Coin và Token dựa trên thuộc tính text
    get coinTab() { return $('//android.widget.TextView[@text="Coin"]'); }
    get tokenTab() { return $('//android.widget.TextView[@text="Token"]'); }

    async switchTab(type: 'coin' | 'token') {
        if (type === 'coin' || type === 'evm') {
            // Dùng contains và cho phép chờ tối đa 5 giây để element kịp load
            const coinTab = $('//android.widget.TextView[contains(@text, "Coin") or contains(@text, "COIN")]');
            await coinTab.waitForDisplayed({ timeout: 5000 });
            await coinTab.click();
        } else {
            const tokenTab = $('//android.widget.TextView[contains(@text, "Token") or contains(@text, "TOKEN")]');
            await tokenTab.waitForDisplayed({ timeout: 5000 });
            await tokenTab.click();
        }
        await browser.pause(1000); // Đợi hiệu ứng chuyển tab ổn định
    }

    /**
     * Lấy số dư hiển thị bên cạnh tên Symbol (VD: ETH, MATIC, XTZ...)
     */
    async getAssetBalanceUI(symbol: string): Promise<number> {
        try {
            // Sửa lại cú pháp XPath cho chuẩn để tìm thẻ chứa số dư ngay cạnh hoặc phía dưới symbol
            const balanceElement = $(`//android.widget.TextView[@text="${symbol}"]/following-sibling::android.widget.TextView[1]`);
            
            let rawText = '';
            if (await balanceElement.isExisting()) {
                rawText = await balanceElement.getText();
            } else {
                // Fallback: Quét tất cả các TextView trong cùng một khối chứa symbol
                const altElement = $(`//android.widget.TextView[@text="${symbol}"]/ancestor::android.view.ViewGroup[1]//android.widget.TextView[contains(@text, ".")]`);
                if (await altElement.isExisting()) {
                    rawText = await altElement.getText();
                }
            }

            console.log(`📱 [UI Text đọc được cho ${symbol}]:`, rawText);

            // Làm sạch chuỗi, chỉ giữ lại số và dấu chấm
            const cleanText = rawText.replace(/[^0-9.]/g, '');
            return parseFloat(cleanText) || 0;
        } catch (error) {
            console.error(`❌ Lỗi đọc UI cho ${symbol}:`, error);
            return 0;
        }
    }

    async verifyBalanceSync(symbol: string) {
        const assetConfig = TARGET_ASSETS.find(asset => asset.symbol === symbol);
        if (!assetConfig) {
            throw new Error(`Không tìm thấy cấu hình cho tài sản: ${symbol}`);
        }

        // Chuyển tab tương ứng
        const targetTab = (assetConfig.type === 'token' || assetConfig.network === 'evm-token') ? 'token' : 'coin';
        await this.switchTab(targetTab);

        // Lấy số dư On-chain từ core logic
        const onChainBalance = await getOnChainBalance(assetConfig);
        console.log(`🔗 [On-Chain] ${symbol}: ${onChainBalance}`);

        // Lấy số dư trên UI App
        const uiBalance = await this.getAssetBalanceUI(symbol);
        console.log(`📱 [App UI] ${symbol}: ${uiBalance}`);

        // So sánh
        expect(uiBalance).toBeCloseTo(onChainBalance, 4);
    }
}

export default new WalletPage();