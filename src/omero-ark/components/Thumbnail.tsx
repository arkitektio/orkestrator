import { useFakts } from '@jhnnsrs/fakts';
import { useHerre } from '@jhnnsrs/herre';
import React from 'react';



type ApiCallParams = {
    id: string;
    fakts: any;
    size?: number;
}

type ImageWithAuthProps = Omit<ApiCallParams, "fakts"> & {
    id: string;
    className?: string;
}



const apiUrlFromImageID = ({size = 200, fakts, id}: ApiCallParams ) => {
    return `${fakts.omero_ark.endpoint_url.replace("/graphql", "")}/api/thumbnails/${id}?size=${size}`;
}


const AuthorizedImage: React.FC<ImageWithAuthProps> = (props) => {

    const { fakts } = useFakts();
    const {token} = useHerre();


    // Components refs
    const img: React.Ref<HTMLImageElement> = React.createRef();

    // Load data
    React.useEffect(() => {
        if (!props.id) return;
        if (img.current === null) return;
        fetch(apiUrlFromImageID({...props, fakts}), 
        {
            headers: {
                'Accept': 'image/jpeg',
                "Authorization": "Bearer " + token,
            }
        }).then(res => res.blob()).then((res) => {


            console.log("blob: ", res);
            var objectURL = URL.createObjectURL(res);
            if (img.current === null) return;
            img.current.src = objectURL;
        });
    }, [props.id, img]);

    return (
        <img src={""} alt={"Loading..."} ref={img} {...props}/>
    );

};

export default AuthorizedImage;