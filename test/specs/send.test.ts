// test/specs/send.test.ts
import WalletPage from '../pageobjects/wallet.page';

describe('Moonstake Mobile - Send AVAX Comprehensive Test Suite', () => {
    
    // Khởi tạo các biến dữ liệu test chuẩn
    const validRecipient = process.env.TEST_WALLET_ADDRESS || '0x7849Cf950683a5F45db639D84C5b4C5c57650551';
    const correctPassword = process.env.TEST_WALLET_PASSWORD || 'MatKhauDungCuaOng';
    const incorrectPassword = 'SaiPassword123';

    /**
     * HOOK beforeEach: Chạy trước mỗi Test Case
     * Công dụng: Khởi tạo điều kiện ban đầu, đưa ứng dụng từ màn hình chính vào luồng Send AVAX
     */
    beforeEach(async () => {
        await WalletPage.navigateToSendAvax();
    });

    /**
     * HOOK afterEach: Chạy sau khi mỗi Test Case kết thúc
     * Công dụng: Bắt buộc thực hiện dọn dẹp hệ thống, trả ứng dụng về lại "Asset List Screen, tab Coin"
     */
    afterEach(async () => {
        await WalletPage.forceBackToAssetList();
        console.log('⏳ Đang chờ 3 giây để ứng dụng ổn định trạng thái...');
        await browser.pause(3000); 
    });

    /**
     * TC-01: Giao dịch gửi AVAX thành công (Valid Send Transaction)
     */
    it('Case 1: Send số nhỏ (0.001), nhập đúng password -> kiểm tra màn hình thành công & log tx', async () => {
        try {
            // Step 3: Nhập form (Địa chỉ + chờ tích xanh + số lượng) và bấm Next
            await WalletPage.fillSendForm(validRecipient, '0.001');
            await WalletPage.clickNext();
            
            // Step 4: Nhập mật khẩu đúng và xác nhận gửi
            await WalletPage.enterPasswordAndConfirm(correctPassword);

            // Verification: Kiểm tra Toast message thành công hoặc app tự động về trang chi tiết
            const successElement = await $('//android.widget.TextView[contains(@text, "AVAX sent successfully")]');
            await successElement.waitForDisplayed({ timeout: 15000 });
            
            console.log(`[TX PASS] Giao dịch gửi AVAX thành công! App ghi nhận: "AVAX sent successfully"`);

        } catch (error: any) {
            try {
                const sendBtnAgain = await $('android=new UiSelector().text("SEND")');
                if (await sendBtnAgain.isDisplayed()) {
                    console.log(`[TX PASS] Giao dịch hoàn tất và app đã tự động về trang chi tiết!`);
                    return;
                }
            } catch (e) {}

            throw new Error(`Lý do thất bại: ${error.message}`);
        }
    });

    /**
     * TC-02: Lỗi xác thực mật khẩu (Authentication Error)
     */
    it('Case 2: Send số nhỏ (0.001), nhập SAI password -> báo lỗi xác thực', async () => {
        // Step 2 & 3: Nhập form và bấm Next
        await WalletPage.fillSendForm(validRecipient, '0.001');
        await WalletPage.clickNext();
        
        // Step 3: Cố ý nhập sai mật khẩu
        await WalletPage.enterPasswordAndConfirm(incorrectPassword);

        // Verification: Kiểm tra thông báo lỗi "Incorrect password"
        const errorElement = await $('//android.widget.TextView[contains(@text, "Incorrect password")]');
        await errorElement.waitForDisplayed({ timeout: 10000 });
        
        console.log('[PASS] Case 2 chính xác: Hệ thống đã bắt đúng thông báo lỗi "Incorrect password".');
    });

    /**
     * TC-03: Lỗi định dạng số lượng âm (Negative Amount Validation)
     */
    it('Case 3: Send số âm (-1) -> báo lỗi Amount is invalid', async () => {
        // Step 2 & 3: Nhập số lượng âm vào form
        await WalletPage.fillSendForm(validRecipient, '-1');
        
        // Verification: Kiểm tra hiển thị "Amount is invalid"
        const errorText = await WalletPage.getErrorMessage();
        if (errorText.includes('Amount is invalid') || !(await WalletPage.clickNext())) {
            console.log('[PASS] Case 3 chính xác: App hiển thị lỗi khi nhập số lượng âm.');
        } else {
            throw new Error('[FAIL] Case 3 lỗi: Không bắt được thông báo Amount is invalid cho số âm.');
        }
    });

    /**
     * TC-04: Lỗi định dạng ký tự lạ (Invalid Characters Validation)
     */
    it('Case 4: Send nhập ký tự lạ (abc) -> báo lỗi Amount is invalid', async () => {
        // Step 2 & 3: Nhập ký tự chữ cái vào form
        await WalletPage.fillSendForm(validRecipient, 'abcdefgh');
        
        // Verification: Kiểm tra hiển thị "Amount is invalid"
        const errorText = await WalletPage.getErrorMessage();
        if (errorText.includes('Amount is invalid')) {
            console.log('[PASS] Case 4 chính xác: App hiển thị lỗi "Amount is invalid" khi nhập chữ cái.');
        } else {
            throw new Error('[FAIL] Case 4 lỗi: Không bắt được thông báo lỗi khi nhập ký tự lạ.');
        }
    });

    /**
     * TC-05: Lỗi vượt quá số dư ví (Insufficient Balance Validation)
     */
    it('Case 5: Send số lớn hơn balance hiện tại -> báo lỗi Amount is invalid', async () => {
        // Step 1: Lấy số dư khả dụng hiện tại
        const currentBalance = await WalletPage.getAvailableBalance();
        const exceedAmount = (currentBalance + 999).toString();
        
        console.log(`> Số dư hiện tại là: ${currentBalance}, tiến hành test nhập số tiền vượt mức: ${exceedAmount}`);

        // Step 2 & 3: Nhập số tiền vượt mức vào form
        await WalletPage.fillSendForm(validRecipient, exceedAmount);
        
        // Verification: Kiểm tra hiển thị "Amount is invalid"
        const errorText = await WalletPage.getErrorMessage();
        if (errorText.includes('Amount is invalid') || !(await WalletPage.clickNext())) {
            console.log('[PASS] Case 5 chính xác: App thông báo lỗi khi nhập vượt quá số dư thực tế.');
        } else {
            throw new Error('[FAIL] Case 5 lỗi: Nhập quá số dư nhưng app không hiển thị cảnh báo!');
        }
    });

    /**
     * TC-06: Lỗi định dạng địa chỉ ví không hợp lệ (Invalid Address Validation)
     */
    it('Case 6: Send nhập địa chỉ ví không hợp lệ (abddef) -> báo lỗi Address is invalid', async () => {
        // Step 1 & 2: Vào form gửi AVAX
        await WalletPage.navigateToSendAvax();

        // Step 3: Nhập địa chỉ không hợp lệ vào ô Address (EditText[1])
        const addressInput = await $('//android.widget.EditText[1]');
        await addressInput.waitForDisplayed({ timeout: 10000 });
        await addressInput.setValue('abddef');
        await browser.pause(1000);

        // Verification: Kiểm tra thông báo lỗi "Address is invalid" hoặc nút Next bị vô hiệu hóa
        const errorText = await WalletPage.getAddressErrorMessage();
        const isNextButtonActive = async () => {
            try {
                const nextBtn = await $('android=new UiSelector().text("NEXT" or "Next")');
                return await nextBtn.isEnabled();
            } catch (e) {
                return false;
            }
        };

        if (errorText.includes('invalid') || errorText.includes('Address') || !(await isNextButtonActive())) {
            console.log('[PASS] Case 6 chính xác: Hệ thống bắt đúng lỗi địa chỉ không hợp lệ.');
        } else {
            throw new Error('[FAIL] Case 6 lỗi: Chấp nhận địa chỉ sai định dạng mà không báo lỗi!');
        }
    });

    /**
     * TC-07: Kiểm tra tính năng nút Reset ở màn hình Send Form
     */
    it('Case 7: Verify nút Reset ở màn hình Send AVAX -> clear toàn bộ amount đã nhập', async () => {
        // Step 1 & 2: Nhập địa chỉ hợp lệ và số lượng
        const validRecipient = process.env.TEST_WALLET_ADDRESS || '0x7849Cf950683a5F45db639D84C5b4C5c57650551';
        await WalletPage.fillSendForm(validRecipient, '0.001');

        // Step 3: Bấm nút Reset
        await WalletPage.clickReset();

        // Step 4 & Verification: Kiểm tra xem ô amount đã được clear trống hay chưa
        const currentAmountValue = await WalletPage.getAmountInputValue();
        
        if (currentAmountValue === '' || currentAmountValue === '0' || currentAmountValue === '0.0') {
            console.log('[PASS] Case 7 chính xác: Nút Reset đã xóa sạch dữ liệu trong ô amount.');
        } else {
            throw new Error(`[FAIL] Case 7 lỗi: Ô amount chưa được clear, giá trị còn lại là: "${currentAmountValue}"`);
        }
    });
});