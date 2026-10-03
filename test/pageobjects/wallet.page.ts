// test/pageobjects/wallet.page.ts
import { $ } from '@wdio/globals';
import { getOnChainBalance } from '../../core/blockchain/rpc';
import { TARGET_ASSETS } from '../../core/config/networks';

class WalletPage {
    // --- CÁC LOCATOR GỐC ---
    get coinTab() { return $('//android.widget.TextView[@text="Coin"]'); }
    get tokenTab() { return $('//android.widget.TextView[@text="Token"]'); }

    /**
     * Chuyển đổi giữa tab Coin và Token trên Asset List Screen
     * @param type - Loại tab cần chuyển ('coin' hoặc 'token')
     */
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
     * Lấy số dư hiển thị trên UI bên cạnh tên Symbol của tài sản
     * @param symbol - Ký hiệu tài sản (VD: AVAX, ETH...)
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

    /**
     * Kiểm tra đồng bộ số dư giữa On-Chain và UI App
     * @param symbol - Ký hiệu tài sản cần kiểm tra
     */
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

    /**
     * Xử lý và bấm tắt các popup thông báo hoặc popup xin quyền hệ thống (Camera, Notification)
     */
    async handleNotificationPopup() {
        // 1. Xử lý nút Cancel trên popup thông báo
        try {
            const cancelBtn = await $('android=new UiSelector().text("Cancel")');
            await cancelBtn.waitForDisplayed({ timeout: 3000 });
            console.log('🔔 Đã phát hiện và bấm Cancel trên popup thành công!');
            await cancelBtn.click();
            await browser.pause(1000);
        } catch (e) {}

        // 2. Xử lý popup xin quyền camera của Android ("While using the app")
        try {
            const allowBtn = await $('android=new UiSelector().textContains("While using the app")');
            if (await allowBtn.isExisting()) {
                console.log('📷 Phát hiện popup xin quyền camera, bấm "While using the app"...');
                await allowBtn.click();
                await browser.pause(1000);
            }
        } catch (e) {}

        // 3. Phòng hờ kẹt ở trang Notifications
        try {
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

    /**
     * HÀM DỌN DẸP SỬ DỤNG APP BACK BUTTON: Bấm liên tục vào mũi tên lùi (<) trên header ứng dụng cho đến khi về màn hình chính
     */
    async forceBackToAssetList() {
        console.log('🔄 Đang dọn dẹp bằng nút Back trên app để về Asset List...');
        
        for (let i = 0; i < 6; i++) {
            // 1. Kiểm tra xem đã về tới màn hình chính (thấy tab Coin) chưa. Nếu thấy rồi -> Dừng ngay!
            try {
                const coinTab = $('//android.widget.TextView[contains(@text, "Coin") or contains(@text, "COIN")]');
                if (await coinTab.isExisting() && await coinTab.isDisplayed()) {
                    console.log('✅ Đã về tới Asset List Screen, tab Coin an toàn tuyệt đối!');
                    break;
                }
            } catch (e) {}

            // 2. Tìm và bấm vào nút mũi tên Back màu xanh (<) trên header của app
            try {
                // Locator bắt mũi tên lùi màu xanh ở góc trái các màn hình con
                const appBackBtn = $('//android.widget.ImageView[@bounds] | //android.widget.TextView[@text="" and preceding-sibling::*] | (//*[@class="android.widget.ImageView" or @class="android.widget.TextView"])[1]');
                
                // Hoặc bắt theo dạng icon mũi tên góc trái dựa trên vị trí hoặc class
                const backArrow = await $('//android.widget.ImageView[1] | //android.widget.TextView[contains(@text, "C-Chain") or contains(@text, "AVAX")]/ancestor::android.view.ViewGroup[1]//android.widget.ImageView[1]');
                
                if (await appBackBtn.isExisting() && await appBackBtn.isDisplayed()) {
                    console.log('🔙 Đang bấm nút Back (<) trên app...');
                    await appBackBtn.click();
                    await browser.pause(1200);
                    continue;
                }
            } catch (e) {}

            // 3. Phòng hờ nếu nút Back UI không bắt được, thử bấm một nhịp phím cứng Android làm phương án dự phòng
            try {
                await browser.execute('mobile: pressKey', { keycode: 4 });
                await browser.pause(1000);
            } catch (err) {}
        }
        await browser.pause(1000);
    }

    // --- CÁC HÀM XỬ LÝ LUỒNG GỬI AVAX ---

    /**
     * Bước 1 & 2: Dọn dẹp, từ Asset List Screen chuyển vào Asset Detail Screen rồi bấm SEND sang Send Form Screen
     */
    async navigateToSendAvax() {
        await this.handleNotificationPopup();

        // Đảm bảo ở màn hình chính
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

        // Chuyển về tab Coin
        try {
            const coinTab = $('//android.widget.TextView[contains(@text, "Coin") or contains(@text, "COIN")]');
            if (await coinTab.isDisplayed()) {
                await coinTab.click();
            }
        } catch (e) {}
        await browser.pause(1000);
        
        // Click chọn AVAX để mở Asset Detail Screen
        const avaxAsset = await $('android=new UiSelector().textContains("AVAX")');
        await avaxAsset.waitForDisplayed({ timeout: 6000 });
        await avaxAsset.click();

        // Bấm nút SEND màu xanh để sang Send Form Screen
        const sendButton = await $('android=new UiSelector().text("SEND")');
        await sendButton.waitForDisplayed({ timeout: 6000 });
        await sendButton.click();
        await browser.pause(1500);
    }

    /**
     * Bước 3 (Send Form Screen): Điền địa chỉ ví (có chờ tích xanh validate), điền số lượng và bấm Next
     * @param address - Địa chỉ ví nhận
     * @param amount - Số lượng AVAX cần gửi
     */
    async fillSendForm(address: string, amount: string) {
        // 1. Điền địa chỉ vào ô EditText đầu tiên (tránh bấm nhầm icon QR)
        const addressInput = await $('(//*[@class="android.widget.EditText"])[1]');
        await addressInput.waitForDisplayed({ timeout: 5000 });
        await addressInput.click();
        await addressInput.setValue(address);
        console.log('✍️ Đã điền địa chỉ ví.');

        // 2. CHỜ ĐỢI: Chờ xuất hiện dấu tích xanh (checkmark) xác thực địa chỉ ví hợp lệ
        try {
            const validCheckIcon = await $('//android.widget.EditText[1]/following-sibling::*[contains(@class, "ImageView") or @resource-id] | //android.widget.EditText[1]/..//*[contains(@class, "ImageView")]');
            await validCheckIcon.waitForDisplayed({ timeout: 6000 });
            console.log('✅ Phát hiện dấu tích xanh xác thực địa chỉ ví thành công!');
        } catch (e) {
            console.log('⚠️ Không bắt được icon tích xanh trực tiếp, tiếp tục luồng...');
        }

        // 3. Điền số lượng vào ô Amount (EditText thứ 2)
        const amountInput = await $('(//*[@class="android.widget.EditText"])[2]');
        await amountInput.waitForDisplayed({ timeout: 5000 });
        await amountInput.click();
        await amountInput.setValue(amount);
        console.log('✍️ Đã điền số lượng AVAX.');
        
        await browser.pause(1000);
    }

    /**
     * Bấm nút Next để chuyển từ Send Form Screen sang Password Confirmation Screen
     */
    async clickNext() {
        const nextButton = await $('android=new UiSelector().text("Next")');
        await nextButton.waitForDisplayed({ timeout: 5000 });
        await nextButton.click();
        await browser.pause(2000);
    }

    /**
     * Bước 4 (Password Confirmation Screen): Nhập mật khẩu ví và xác nhận gửi giao dịch
     * @param password - Mật khẩu bảo mật của ví
     */
    async enterPasswordAndConfirm(password: string) {
        const passwordInput = await $('android=new UiSelector().className("android.widget.EditText")');
        await passwordInput.waitForDisplayed({ timeout: 5000 });
        await passwordInput.setValue(password);
        
        const finalSendButton = await $('(//*[@text="Send"])[last()]');
        await finalSendButton.waitForDisplayed({ timeout: 5000 });
        await finalSendButton.click();
        
        console.log('🚀 Đã gửi giao dịch, đang chờ xử lý...');
        await browser.pause(4000);

        await this.handleNotificationPopup();
    }

    /**
     * Lấy nội dung thông báo lỗi trên form (VD: "Amount is invalid")
     */
    async getErrorMessage(): Promise<string> {
        try {
            const errorElement = await $('android=new UiSelector().textContains("Amount is invalid")');
            return await errorElement.getText();
        } catch (e) {
            return "";
        }
    }

    /**
     * Lấy thông tin số dư khả dụng (Available Balance) hiện tại trên ví
     */
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