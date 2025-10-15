
import React from 'react';

interface ToastProps {
    message: string;
    show: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, show }) => {
    return (
        <div 
            className={`fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-dark text-white px-4 py-2 rounded-lg shadow-lg transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}
        >
            {message}
        </div>
    );
};

export default Toast;
