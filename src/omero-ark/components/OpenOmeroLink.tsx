import { useFakts } from "@jhnnsrs/fakts";
import { useEffect, useState } from "react";



export const OpenOmeroLink = (props: { url: string, children?: React.ReactNode }) => {


    const { fakts } = useFakts();
    const [link, setLink] = useState<string | null>(null);



    useEffect(() => {
        if (!props.url) {
            setLink(null);
            return;
        }
        if (!fakts?.omero_web) {
            setLink(null);
            return;
        }
       const url = `http://${fakts?.omero_web?.host}:${fakts?.omero_web?.port}/${props.url}`;

        setLink(url); 




    }, [props.url, fakts]);



    return (
        <>
        {link && <a href={link} target="_blank" className="bg-gray-300 rounded rounded-md px-1 py-1 text-sm font-light hover:bg-gray-400">{props.children || "Open In Omero Web"}</a>}
        </>
    );

}