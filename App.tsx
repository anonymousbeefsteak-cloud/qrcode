

import React, { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import QRCodeSection from './components/QRCodeSection';
import Instructions from './components/Instructions';
import Footer from './components/Footer';
import Toast from './components/Toast';

// It's good practice to declare global variables from external scripts
// to avoid TypeScript errors.
declare global {
    interface Window {
        liff: any;
    }
}

const App = () => {
    const [showToast, setShowToast] = useState(false);
    // Fix: Explicitly define the type for the 'bindingStatus' state to match the prop type expected by the QRCodeSection component.
    const [bindingStatus, setBindingStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState('');

    const handleCopy = useCallback(() => {
        setShowToast(true);
        setTimeout(() => {
            setShowToast(false);
        }, 3000);
    }, []);

    useEffect(() => {
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwW-GEV71uyzRJDx9RxinYcBdPh6U7r_EWkOsgPrPc8Wuq-Q7SHpoD0QZpMSsGyexTRPg/exec';
        const LIFF_ID = '2008276630-bYNjwMx7';

        const initializeLiffAndBindUser = async () => {
            try {
                const liff = window.liff;
                if (!liff) {
                    setBindingStatus('error');
                    console.error('LIFF SDK not found.');
                    return;
                }
                
                await liff.init({ liffId: LIFF_ID });

                if (!liff.isLoggedIn()) {
                    liff.login();
                    return; 
                }
                
                setBindingStatus('syncing');
                const profile = await liff.getProfile();
                
                setUserName(profile.displayName);
                setUserId(profile.userId);

                if (sessionStorage.getItem('line_user_bound_session')) {
                    setBindingStatus('success');
                    return;
                }
                
                const payload = {
                    source: 'line_web_app',
                    customerName: profile.displayName,
                    customerLineId: profile.userId
                };

                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    cache: 'no-cache',
                    headers: {
                      'Content-Type': 'text/plain;charset=utf-8',
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

                const result = await response.json();
                if (result.status !== 'success') throw new Error(result.message || 'Unknown error from script');

                sessionStorage.setItem('line_user_bound_session', 'true');
                setBindingStatus('success');

            } catch (error) {
                console.error('LIFF initialization or binding failed:', error);
                setBindingStatus('error');
            }
        };

        initializeLiffAndBindUser();

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
                    <QRCodeSection onCopy={handleCopy} bindingStatus={bindingStatus} userName={userName} userId={userId} />
                    <Instructions />
                </div>
            </main>
            <Footer />
            <Toast message="已複製到剪貼簿" show={showToast} />
        </div>
    );
};

export default App;