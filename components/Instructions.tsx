
import React from 'react';

const Instructions = () => {
    return (
        <div className="bg-white rounded-xl p-6 shadow-md">
            <h3 className="text-xl font-bold mb-4 flex items-center">
                <i className="fa fa-info-circle text-primary mr-2"></i>使用說明
            </h3>
            <ol className="space-y-4">
                <li className="flex items-start">
                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">1</div>
                    <p>打開LINE應用程式，點擊右上角的「+」號</p>
                </li>
                <li className="flex items-start">
                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">2</div>
                    <p>選擇「掃描」選項，將鏡頭對準上方二維碼</p>
                </li>
                <li className="flex items-start">
                    <div className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 mr-3">3</div>
                    <p>掃描成功後，按照提示完成添加好友或加入群組的操作</p>
                </li>
            </ol>
        </div>
    );
};

export default Instructions;
