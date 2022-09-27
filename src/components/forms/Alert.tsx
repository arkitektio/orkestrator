import React from 'react';

export type IAlertProps = {
    prepend: string
    message: string
    
}

const Alert: React.FC<IAlertProps> = ({ prepend, message}) => {
    return (
        <div className="bg-red-100 border border-red-400 text-sm text-red-700 px-4 py-3 rounded relative mt-2" role="alert">
  <strong className="font-bold">{prepend}:</strong>{" "}
  <span className="block sm:inline">{message}</span>
</div>
    );
}

export { Alert };