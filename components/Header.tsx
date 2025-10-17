
import React from 'react';

const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-sm">
            <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <i className="fa fa-comment text-white text-xl"></i>
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold">LINE 二維碼</h1>
                </div>
                <div>
                    <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg transition duration-300 flex items-center">
                        <i className="fa fa-share-alt mr-2"></i>分享
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
