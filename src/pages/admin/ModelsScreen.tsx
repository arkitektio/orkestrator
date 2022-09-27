import React from 'react';
import { Models } from '../../arkitekt/components/admin/Models';

export type IModelsScreenProps = {
    
}

const ModelsScreen: React.FC<IModelsScreenProps> = ({ }) => {
    return (
        <div className="p-4">
            <Models/>
        </div>
    );
}

export { ModelsScreen };