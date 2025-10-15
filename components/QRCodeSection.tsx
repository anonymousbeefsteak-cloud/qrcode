
import React from 'react';

interface QRCodeSectionProps {
    onCopy: () => void;
    bindingStatus: 'idle' | 'syncing' | 'success' | 'error';
    userName: string;
    userId: string;
}

const QRCodeSection: React.FC<QRCodeSectionProps> = ({ onCopy, bindingStatus, userName, userId }) => {
    const lineAddFriendUrl = 'https://line.me/R/ti/p/@561zotgq';
    const qrCodeUrl = "https://p11-flow-imagex-download-sign.byteimg.com/tos-cn-i-a9rns2rl98/4e03bdf943d1443ea3ec5fa72978155a.png~tplv-a9rns2rl98-24:720:720.png?rcl=20251011120817294D51A8FB4817821CDD&rk3s=8e244e95&rrcfp=8a172a1a&x-expires=1760760497&x-signature=sMiaEFbK7IUchDhVNcD3LSxPHU0%3D";

    const handleIdCopy = () => {
        if (userId) {
            navigator.clipboard.writeText(userId);
            onCopy();
        }
    };

    const renderBindingStatus = () => {
        switch (bindingStatus) {
            case 'syncing':
                return (
                    <div className="text-center mt-6 p-3 bg-blue-50 text-blue-700 rounded-lg">
                        <p className="text-sm font-medium flex items-center justify-center">
                            <i className="fa fa-spinner fa-spin mr-2"></i>正在連結您的LINE帳號...
                        </p>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center mt-6 p-3 bg-green-50 text-green-700 rounded-lg">
                        <p className="text-sm font-medium flex items-center justify-center">
                            <i className="fa fa-check-circle mr-2"></i>LINE帳號已連結成功！
                        </p>
                    </div>
                );
            case 'error':
                return (
                    <div className="text-center mt-6 p-3 bg-red-50 text-red-700 rounded-lg">
                        <p className="text-sm font-medium flex items-center justify-center">
                            <i className="fa fa-exclamation-circle mr-2"></i>帳號連結失敗，請重新整理頁面。
                        </p>
                    </div>
                );
            case 'idle':
            default:
                return null;
        }
    };

    return (
        <div className="bg-white rounded-xl p-6 md:p-10 qr-shadow mb-10 flex flex-col items-center">
            <div className="relative mb-6">
                <img 
                    src={qrCodeUrl}
                    alt="LINE二維碼"
                    className="w-64 h-64 md:w-80 md:h-80 object-contain border-4 border-gray-100 rounded-lg"
                />
                <div className="absolute -top-3 -left-3 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                <div className="absolute -top-3 -right-3 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                <div className="absolute -bottom-3 -left-3 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                <div className="absolute -bottom-3 -right-3 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
            </div>
            
            <div className="text-center w-full mt-4">
                 <p className="text-gray-700 mb-4">若無法掃描，可點擊下方按鈕加入</p>
                 <a
                    href={lineAddFriendUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-lg transition duration-300 font-bold text-lg shadow-md hover:shadow-lg w-full md:w-auto"
                    aria-label="Add Friend on LINE"
                 >
                    <i className="fa fa-user-plus mr-2"></i>
                    點此加入好友
                 </a>
            </div>

            {userName && userId && (
                <div className="w-full mt-8 pt-6 border-t border-gray-200">
                    <h4 className="text-lg font-semibold text-center mb-4 text-gray-700">已連結的LINE帳號資訊</h4>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <i className="fa fa-user mr-2 text-primary"></i>
                                LINE 姓名
                            </label>
                            <p className="w-full bg-gray-100 rounded-lg p-3 text-gray-800 font-medium">
                                {userName}
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 flex items-center mb-1">
                                <i className="fa fa-id-card-o mr-2 text-primary"></i>
                                LINE User ID
                            </label>
                            <div className="w-full bg-gray-100 rounded-lg p-3 text-gray-800 flex justify-between items-center">
                                <span className="truncate mr-4" title={userId}>{userId}</span>
                                <button 
                                    onClick={handleIdCopy} 
                                    className="text-gray-500 hover:text-primary transition-colors flex-shrink-0"
                                    aria-label="複製User ID"
                                >
                                    <i className="fa fa-clone fa-lg"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {renderBindingStatus()}
        </div>
    );
};

export default QRCodeSection;
