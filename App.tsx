import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import QRCodeSection from './components/QRCodeSection';
import Instructions from './components/Instructions';
import Footer from './components/Footer';
import Toast from './components/Toast';

type BindingStatus = 'idle' | 'syncing' | 'success' | 'error';

const App: React.FC = () => {
    const [showToast, setShowToast] = useState(false);
    const [bindingStatus, setBindingStatus] = useState<BindingStatus>('idle');

    const handleCopy = useCallback(() => {
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    }, []);

    useEffect(() => {
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwUvQR7aVmq174RvXkMZcjJk-fq6TuC3GavhdmP1MUar-Geg7LwbidZ_uoREjjsSFA/exec';
        // IMPORTANT: Replace with your actual LIFF ID from the LINE Developers console.
        const LIFF_ID = 'YOUR_LIFF_ID_HERE';

        const initializeLiffAndBindUser = async () => {
            try {
                const liff = (window as any).liff;
                if (!liff) {
                    console.warn('LIFF SDK not found.');
                    setBindingStatus('idle');
                    return;
                }
                
                await liff.init({ liffId: LIFF_ID });

                if (!liff.isLoggedIn()) {
                    console.log('User is not logged in to LINE.');
                    setBindingStatus('idle');
                    return;
                }

                if (sessionStorage.getItem('line_user_bound_session')) {
                    setBindingStatus('success');
                    return;
                }
                
                setBindingStatus('syncing');
                const profile = await liff.getProfile();
                
                const payload = {
                    source: 'line_web_app',
                    customerName: profile.displayName,
                    customerLineId: profile.userId,
                    notes: 'Automatic user binding via LIFF',
                    items: [],
                    totalAmount: 0,
                    pickupTime: new Date().toLocaleDateString('zh-TW'),
                };

                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                sessionStorage.setItem('line_user_bound_session', 'true');
                setBindingStatus('success');

            } catch (error) {
                console.error('LIFF initialization or binding failed:', error);
                setBindingStatus('error');
            }
        };

        window.addEventListener('load', initializeLiffAndBindUser);

        return () => {
            window.removeEventListener('load', initializeLiffAndBindUser);
        };
    }, []);


    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 md:py-16">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-[clamp(1.5rem,3vw,2.5rem)] font-bold mb-4">掃描二維碼加入聯繫</h2>
                        <p className="text-gray-600 text-lg">使用LINE應用程式掃描下方二維碼，立即添加為好友或加入群組</p>
                    </div>
                    <QRCodeSection onCopy={handleCopy} bindingStatus={bindingStatus} />
                    <Instructions />
                </div>
            </main>
            <Footer />
            <Toast message="已複製到剪貼簿" show={showToast} />
        </div>
    );
};

export default App;
