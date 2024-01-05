import { useFakts } from '@jhnnsrs/fakts';
import { useHerre } from '@jhnnsrs/herre';
import React from 'react';

type ImageWithAuthProps = {
    id: string;
}


const apiUrlFromImageID = (id: string, fakts: any) => {
    return `${fakts.omero_ark.endpoint_url.replace("/graphql", "")}/api/thumbnails/${id}`;
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
        fetch(apiUrlFromImageID(props.id, fakts), 
        {
            headers: {
                'Accept': 'image/jpeg',
                "Authorization": "Bearer " + token,
            }
        }).then(res => res.blob()).then((res) => {


            console.log("blob: ", res);
            var objectURL = URL.createObjectURL(res);
            img.current.src = objectURL;
        });
    }, [props.id, img]);

    return (
        <img src={""} alt={"Loading..."} ref={img} />
    );

};

export default AuthorizedImage;