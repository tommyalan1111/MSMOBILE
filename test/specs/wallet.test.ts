import WalletPage from '../pageobjects/wallet.page';

describe('Moonstake Mobile - Wallet Balance Verification', () => {
    it('Kiểm tra số dư ETH (Tab Coin)', async () => {
        await WalletPage.verifyBalanceSync('ETH');
    });

    it('Kiểm tra số dư MATIC (Tab Coin)', async () => {
        await WalletPage.verifyBalanceSync('MATIC');
    });

    //it('Kiểm tra số dư XTZ (Tab Coin)', async () => {
    //    await WalletPage.verifyBalanceSync('XTZ');
    //});

    it('Kiểm tra số dư AVAX (Tab Coin)', async () => {
        await WalletPage.verifyBalanceSync('AVAX');
    });

    it('Kiểm tra số dư USDT (Tab Token)', async () => {
        await WalletPage.verifyBalanceSync('USDT');
    });
});