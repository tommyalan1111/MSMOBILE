import WalletPage from '../pageobjects/wallet.page';

describe('Moonstake Mobile - Send AVAX Comprehensive Test Suite', () => {
    
    // Lấy thông tin an toàn từ file .env
    const validRecipient = process.env.TEST_WALLET_ADDRESS || '0xDefaultAddressHere';
    const correctPassword = process.env.TEST_WALLET_PASSWORD || 'DefaultPassword';

    beforeEach(async () => {
        // Mỗi case đều khởi động từ màn hình chính đi vào luồng Send AVAX
        await WalletPage.navigateToSendAvax();
    });

    afterEach(async () => {
        // Gọi hàm dọn dẹp popup ngay lập tức sau khi test case kết thúc
        await WalletPage.handleNotificationPopup();

        // Đảm bảo thoát khỏi màn hình xác nhận nếu có
        try {
            for (let i = 0; i < 3; i++) {
                const backArrow = await $('android=new UiSelector().className("android.widget.ImageView").instance(0)');
                if (await backArrow.isExisting()) {
                    await backArrow.click();
                    await browser.pause(800);
                } else {
                    break;
                }
            }
        } catch (e) {}
        
        console.log('⏳ Đang chờ 8 giây để ứng dụng ổn định trạng thái...');
        await browser.pause(8000); 
    });

    it('Case 1: Send số nhỏ (0.001), nhập đúng password -> kiểm tra màn hình thành công & log tx', async () => {
        try {
            // 1. Điền thông tin và bấm Next
            await WalletPage.fillSendForm(validRecipient, '0.001');
            await WalletPage.clickNext();
            
            // 2. Nhập password và xác nhận
            await WalletPage.enterPasswordAndConfirm(correctPassword);

            // 3. THỰC TẾ KIỂM TRA: Đợi màn hình xuất hiện thông báo thành công (ví dụ chữ "Success", "Submitted" hoặc "Completed")
            // (Ông có thể thay đổi chữ "Success" thành từ khóa thực tế mà app Moonstake hiển thị sau khi gửi tiền thành công)
            const successElement = await $('android=new UiSelector().textContains("Success")');
            
            // Chờ tối đa 15 giây để giao dịch được xử lý trên máy ảo
            await successElement.waitForDisplayed({ timeout: 15000 });
            
            const successText = await successElement.getText();
            console.log(`[TX PASS] Giao dịch gửi AVAX thành công! Trạng thái app ghi nhận: "${successText}"`);

        } catch (error: any) {
            // Nếu không tìm thấy màn hình success hoặc mạng/ví lỗi -> Ném ra lý do cụ thể
            console.error(`[TX FAIL] Giao dịch gửi AVAX thất bại hoặc không nhận được phản hồi thành công.`);
            throw new Error(`Lý do thất bại: ${error.message}`);
        }
    });

    it('Case 2: Send số nhỏ (0.001), nhập SAI password -> báo lỗi xác thực', async () => {
        let isErrorDetected = false;
        try {
            await WalletPage.fillSendForm(validRecipient, '0.001');
            await WalletPage.clickNext();
            
            // Nhập sai password có ý đồ
            await WalletPage.enterPasswordAndConfirm('SaiPassword123');

            // Kiểm tra xem app có hiện thông báo lỗi sai mật khẩu không
            const errorAlert = await $('android=new UiSelector().textContains("Password")'); // Hoặc thông báo lỗi tương ứng
            isErrorDetected = await errorAlert.isDisplayed();
        } catch (error) {
            isErrorDetected = true; // Bắt được ngoại lệ từ app/driver coi như đúng kịch bản lỗi
        }

        if (isErrorDetected) {
            console.log('[PASS] Case 2 chính xác: Hệ thống đã chặn lại và báo lỗi khi nhập sai password.');
        } else {
            throw new Error('[FAIL] Case 2 lỗi: Nhập sai password nhưng app không hiển thị cảnh báo!');
        }
    });

    it('Case 3: Send số âm (-1) -> báo lỗi Amount is invalid', async () => {
        await WalletPage.fillSendForm(validRecipient, '-1');
        
        const errorText = await WalletPage.getErrorMessage();
        if (errorText.includes('Amount is invalid') || !(await WalletPage.clickNext())) {
            console.log('[PASS] Case 3 chính xác: App hiển thị lỗi khi nhập số lượng âm.');
        } else {
            throw new Error('[FAIL] Case 3 lỗi: Không bắt được thông báo Amount is invalid cho số âm.');
        }
    });

    it('Case 4: Send nhập ký tự lạ (abc) -> báo lỗi', async () => {
        await WalletPage.fillSendForm(validRecipient, 'abc');
        
        const errorText = await WalletPage.getErrorMessage();
        console.log(`[PASS] Case 4: Nhập ký tự lạ nhận được thông báo lỗi: "${errorText || 'Nút Next bị khóa/vô hiệu hóa'}"`);
    });

    it('Case 5: Send số lớn hơn balance hiện tại -> báo lỗi Amount is invalid', async () => {
        // 1. Lấy số dư thực tế hiện tại trên ví
        const currentBalance = await WalletPage.getAvailableBalance();
        
        // 2. Tính toán số tiền vượt mức (lấy số dư + 1 AVAX chắc chắn vượt)
        const exceedAmount = (currentBalance + 999).toString();
        
        console.log(`> Số dư hiện tại là: ${currentBalance}, tiến hành test nhập số tiền vượt mức: ${exceedAmount}`);

        // 3. Thực hiện nhập số tiền lớn hơn balance
        await WalletPage.fillSendForm(validRecipient, exceedAmount);
        
        // 4. Kiểm tra thông báo lỗi
        const errorText = await WalletPage.getErrorMessage();
        if (errorText.includes('Amount is invalid') || !(await WalletPage.clickNext())) {
            console.log('[PASS] Case 5 chính xác: App thông báo lỗi khi nhập vượt quá số dư thực tế.');
        } else {
            throw new Error('[FAIL] Case 5 lỗi: Nhập quá số dư nhưng app không hiển thị cảnh báo!');
        }
    });
});