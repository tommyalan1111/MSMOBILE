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
            const balanceElement = $(`//android.widget.TextView[@text="${symbol}"]/following-sibling::android.widget.TextView[1]`);
            
            let rawText = '';
            if (await balanceElement.isExisting()) {
                rawText = await balanceElement.getText();
            } else {
                const altElement = $(`//android.widget.TextView[@text="${symbol}"]/ancestor::android.view.ViewGroup[1]//android.widget.TextView[contains(@text, ".")]`);
                if (await altElement.isExisting()) {
                    rawText = await altElement.getText();
                }
            }

            console.log(`📱 [UI Text đọc được cho ${symbol}]:`, rawText);

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

        const targetTab = (assetConfig.type === 'token' || assetConfig.network === 'evm-token') ? 'token' : 'coin';
        await this.switchTab(targetTab);

        const onChainBalance = await getOnChainBalance(assetConfig);
        console.log(`🔗 [On-Chain] ${symbol}: ${onChainBalance}`);

        const uiBalance = await this.getAssetBalanceUI(symbol);
        console.log(`📱 [App UI] ${symbol}: ${uiBalance}`);

        expect(uiBalance).toBeCloseTo(onChainBalance, 4);
    }

    // Hàm phụ trợ: Dùng explicit wait để bắt và bấm tắt popup thông báo bằng được
    async handleNotificationPopup() {
        try {
            // Chờ tối đa 3 giây cho nút "Cancel" xuất hiện hẳn rồi bấm
            const cancelBtn = await $('android=new UiSelector().text("Cancel")');
            await cancelBtn.waitForDisplayed({ timeout: 3000 });
            console.log('🔔 Đã phát hiện và bấm Cancel trên popup Notifications thành công!');
            await cancelBtn.click();
            await browser.pause(1000);
        } catch (e) {
            // Không có popup thì lướt qua êm đẹp
        }

        try {
            // Phòng hờ nếu đã lỡ vào hẳn trang Notifications
            const notiHeader = await $('android=new UiSelector().textContains("Notifications")');
            if (await notiHeader.isExisting()) {
                console.log('🔙 Đang kẹt ở trang Notifications, đang bấm Back để thoát...');
                const backArrow = await $('android=new UiSelector().className("android.widget.ImageView").instance(0)');
                if (await backArrow.isExisting()) {
                    await backArrow.click();
                    await browser.pause(1000);
                }
            }
        } catch (e) {}
    }

    // --- CÁC HÀM XỬ LÝ LUỒNG GỬI AVAX THEO 4 MÀN HÌNH ---

    // Màn hình 1 & 2: Dọn dẹp popup, reset về màn hình chính, chọn AVAX rồi bấm SEND
    async navigateToSendAvax() {
        // 0. BẮT BUỘC GỌI HÀM NÀY ĐẦU TIÊN: Để dọn sạch popup thông báo nếu nó đeo bám
        await this.handleNotificationPopup();

        // 1. Kiểm tra an toàn: Nếu chưa ở màn hình chính, lùi lại 1 nhịp và check lại popup lần nữa
        try {
            const isCoinTabVisible = await $('//android.widget.TextView[contains(@text, "Coin") or contains(@text, "COIN")]').isDisplayed();
            if (!isCoinTabVisible) {
                await browser.back();
                await browser.pause(1000);
                await this.handleNotificationPopup();
            }
        } catch (e) {
            await browser.back();
            await browser.pause(1000);
        }

        // 2. Chuyển về tab Coin (Màn hình 1)
        try {
            const coinTab = $('//android.widget.TextView[contains(@text, "Coin") or contains(@text, "COIN")]');
            if (await coinTab.isDisplayed()) {
                await coinTab.click();
            }
        } catch (e) {}
        await browser.pause(1000);
        
        // 3. Click chọn AVAX để vào màn hình chi tiết (Màn hình 2)
        const avaxAsset = await $('android=new UiSelector().textContains("AVAX")');
        await avaxAsset.waitForDisplayed({ timeout: 6000 });
        await avaxAsset.click();

        // 4. Bấm nút SEND màu xanh ở dưới cùng màn hình chi tiết (Màn hình 2)
        const sendButton = await $('android=new UiSelector().text("SEND")');
        await sendButton.waitForDisplayed({ timeout: 6000 });
        await sendButton.click();
        await browser.pause(1500); // Đợi sang Màn hình 3 (Send Details)
    }

    // Màn hình 3: Điền địa chỉ và số lượng AVAX
    async fillSendForm(address: string, amount: string) {
        const addressInput = await $('android=new UiSelector().className("android.widget.EditText").instance(0)');
        await addressInput.waitForDisplayed({ timeout: 5000 });
        await addressInput.setValue(address);

        const amountInput = await $('android=new UiSelector().className("android.widget.EditText").instance(1)');
        await amountInput.setValue(amount);
        
        await browser.pause(1000);
    }

    // Màn hình 3: Bấm nút Next
    async clickNext() {
        const nextButton = await $('android=new UiSelector().text("Next")');
        await nextButton.waitForDisplayed({ timeout: 5000 });
        await nextButton.click();
        await browser.pause(2000);
    }

    // Màn hình 4: Nhập password và bấm nút Send màu xanh cuối cùng
    async enterPasswordAndConfirm(password: string) {
        const passwordInput = await $('android=new UiSelector().className("android.widget.EditText")');
        await passwordInput.waitForDisplayed({ timeout: 5000 });
        await passwordInput.setValue(password);
        
        const finalSendButton = await $('(//*[@text="Send"])[last()]');
        await finalSendButton.waitForDisplayed({ timeout: 5000 });
        await finalSendButton.click();
        
        console.log('🚀 Đã gửi giao dịch, đang chờ xử lý...');
        await browser.pause(4000); // Đợi broadcast giao dịch

        // Xử lý luôn popup thông báo vừa bật lên sau khi gửi thành công
        await this.handleNotificationPopup();
    }

    async getErrorMessage(): Promise<string> {
        try {
            const errorElement = await $('android=new UiSelector().textContains("Amount is invalid")');
            return await errorElement.getText();
        } catch (e) {
            return "";
        }
    }

    async getAvailableBalance(): Promise<number> {
        const balanceElement = await $('android=new UiSelector().textContains("Available:")');
        const balanceText = await balanceElement.getText(); 
        
        const match = balanceText.match(/[\d.]+/);
        if (match) {
            return parseFloat(match[0]);
        }
        return 0.1; 
    }
}

export default new WalletPage();