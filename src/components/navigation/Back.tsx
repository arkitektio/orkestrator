export const Back = ({
  strokeColor = "#000",
  cubeColor = "#5CDECE",
  aColor = "#000",
  width,
  height,
  onClick,
}: {
  strokeColor?: string;
  cubeColor?: string;
  aColor?: string;
  width: number | string;
  height: number | string;
  onClick: (e: any) => void;
}) => {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        fill="none"
        viewBox="0 0 200 200"
        onClick={onClick}
        className="cursor-pointer"
      >
        <path
          stroke={strokeColor}
          strokeWidth="8"
          d="M97.488 15.749a6 6 0 0 1 6.024 0l68.5 39.767A6 6 0 0 1 175 60.705v79.59a5.998 5.998 0 0 1-2.988 5.189l-68.719 39.894a5.999 5.999 0 0 1-5.685.183l-68.281-33.977A6 6 0 0 1 26 146.212V60.705a6 6 0 0 1 2.988-5.19l68.5-39.766Z"
        />
        <path stroke={strokeColor} strokeWidth="6" d="m52 121-26 17" />
        <path
          stroke={strokeColor}
          strokeWidth="7"
          d="M173.148 143.188 98.442 100.5"
        />
        <path stroke={strokeColor} strokeWidth="6" d="M100.706 17.37v53.922" />
        <g filter="url(#a)">
          <path
            fill={cubeColor}
            d="M96.569 54.702a10.001 10.001 0 0 1 9.407 0l35.842 19.103a10 10 0 0 1 5.296 8.825v36.863a10 10 0 0 1-5.296 8.825l-36.183 19.285a9.998 9.998 0 0 1-8.86.271l-35.5-16.218a10 10 0 0 1-5.845-9.096V82.63a10 10 0 0 1 5.296-8.825L96.57 54.702Z"
          />
          <path
            stroke={cubeColor}
            strokeWidth="8"
            d="m143.699 70.275-35.842-19.103a14 14 0 0 0-13.17 0L58.845 70.275A14 14 0 0 0 51.43 82.63v39.93a14 14 0 0 0 8.182 12.734l35.502 16.219a14 14 0 0 0 12.402-.38l36.183-19.285a14 14 0 0 0 7.415-12.355V82.63a14 14 0 0 0-7.415-12.355Z"
          />
          <path
            stroke={strokeColor}
            strokeOpacity=".04"
            strokeWidth="8"
            d="m143.699 70.275-35.842-19.103a14 14 0 0 0-13.17 0L58.845 70.275A14 14 0 0 0 51.43 82.63v39.93a14 14 0 0 0 8.182 12.734l35.502 16.219a14 14 0 0 0 12.402-.38l36.183-19.285a14 14 0 0 0 7.415-12.355V82.63a14 14 0 0 0-7.415-12.355Z"
          />
        </g>
        <g transform="translate(28 20)">
          <path
            fill={aColor}
            stroke={aColor}
            strokeWidth="4"
            d="M68.642 108.016L68.9968 108.38L69.3549 108.019L73.9861 103.352L74.3326 103.003L73.9893 102.651L56.6171 84.8333H95H95.5V84.3333V77.6666V77.1666H95H56.6171L73.9893 59.349L74.3326 58.9969L73.9861 58.6478L69.3549 53.9811L68.9968 53.6203L68.642 53.9843L42.642 80.6509L42.3017 81L42.642 81.349L68.642 108.016Z"
          />
        </g>
        <defs>
          <filter
            id="a"
            width="109.685"
            height="113.252"
            x="46.43"
            y="44.526"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              result="effect1_foregroundBlur_3_6"
              stdDeviation=".5"
            />
          </filter>
          <filter
            id="b"
            width="62.875"
            height="70.034"
            x="68.341"
            y="63.955"
            colorInterpolationFilters="sRGB"
            filterUnits="userSpaceOnUse"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feGaussianBlur in="BackgroundImage" stdDeviation="4" />
            <feComposite
              in2="SourceAlpha"
              operator="in"
              result="effect1_backgroundBlur_3_6"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset dy="2" />
            <feGaussianBlur stdDeviation="1" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
            <feBlend
              in2="effect1_backgroundBlur_3_6"
              result="effect2_dropShadow_3_6"
            />
            <feBlend
              in="SourceGraphic"
              in2="effect2_dropShadow_3_6"
              result="shape"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
};
