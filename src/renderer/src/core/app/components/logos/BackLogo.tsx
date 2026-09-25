/**
 *
 * The Arkitekt logo is a custom logo that is used in the Arkitekt application.
 * It renders a svg logo that is used in the Arkitekt application.
 * @todo: The a doesnt get rendered in firexfox, this needs to be fixed.
 */

export const BackLogo = ({
  strokeColor = "#000",
  cubeColor = "#5CDECE",
  aColor = "#000",
  width,
  height,
}: {
  strokeColor?: string;
  cubeColor?: string;
  aColor?: string;
  width: number | string;
  height: number | string;
}) => {
  return (
    <>
      <svg
        width={width}
        height={height}
        viewBox="0 0 2603 2602"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g filter="url(#filter0_d_235_111)">
          <path
            d="M1298.49 183.894C1300.35 182.813 1302.65 182.813 1304.52 183.894L2268.13 743.095C2269.98 744.168 2271.12 746.146 2271.12 748.284V1866.74C2271.12 1868.88 2269.98 1870.86 2268.13 1871.93L1304.3 2431.26C1302.55 2432.27 1300.42 2432.34 1298.61 2431.44L335.215 1952.23C333.176 1951.22 331.887 1949.14 331.887 1946.86V748.284C331.887 746.145 333.025 744.168 334.875 743.095L1298.49 183.894Z"
            stroke={strokeColor}
            strokeWidth="74"
          />
          <path
            d="M1288.49 1301.01L325.375 1951.51"
            stroke={strokeColor}
            strokeWidth="74"
          />
          <path
            d="M2264.6 1873.45L1288.47 1301.01"
            stroke={strokeColor}
            strokeWidth="74"
          />
          <path
            d="M1301.5 182.146V883.673"
            stroke={strokeColor}
            strokeWidth="74"
          />
          <g filter="url(#filter1_f_235_111)">
            <path
              d="M1308.91 700.562C1311.88 698.963 1315.44 698.963 1318.41 700.562L1881.07 1004.15C1884.3 1005.9 1886.32 1009.28 1886.32 1012.95V1619C1886.32 1622.67 1884.3 1626.05 1881.07 1627.8L1318.06 1931.57C1315.29 1933.07 1311.98 1933.17 1309.12 1931.85L746.802 1671.79C743.265 1670.15 741 1666.61 741 1662.71V1012.95C741 1009.28 743.017 1005.9 746.251 1004.15L1308.91 700.562Z"
              fill={cubeColor}
            />
            <path
              d="M1888.67 990.073L1326.01 686.481C1318.3 682.323 1309.02 682.323 1301.31 686.481L738.654 990.073C730.243 994.611 725 1003.4 725 1012.95V1662.71C725 1672.84 730.888 1682.06 740.086 1686.31L1302.4 1946.37C1309.84 1949.81 1318.45 1949.54 1325.66 1945.65L1888.67 1641.88C1897.08 1637.34 1902.32 1628.55 1902.32 1619V1012.95C1902.32 1003.4 1897.08 994.611 1888.67 990.073Z"
              stroke={cubeColor}
              strokeWidth="32"
            />
          </g>
        </g>
        <path
          xmlns="http://www.w3.org/2000/svg"
          d="M1626 1563.44C1549.06 1470.15 1480.73 1417.23 1421.01 1404.64C1361.3 1392.07 1304.46 1390.16 1250.46 1398.94V1566L997 1293.39L1250.46 1035V1193.78C1350.29 1194.57 1435.16 1230.14 1505.07 1300.5C1574.97 1370.86 1615.29 1458.5 1626 1563.44Z"
          fill={aColor}
          strokeWidth="70.5833"
          strokeLinejoin="round"
        />
        <defs>
          <filter
            id="filter0_d_235_111"
            x="290.887"
            y="146.084"
            width="2021.23"
            height="2330.98"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="4" />
            <feGaussianBlur stdDeviation="2" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
            />
            <feBlend
              mode="normal"
              in2="BackgroundImageFix"
              result="effect1_dropShadow_235_111"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect1_dropShadow_235_111"
              result="shape"
            />
          </filter>
          <filter
            id="filter1_f_235_111"
            x="708"
            y="666.363"
            width="1211.32"
            height="1299.41"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="0.5"
              result="effect1_foregroundBlur_235_111"
            />
          </filter>
          <filter
            id="filter2_bd_235_111"
            x="979.062"
            y="928.135"
            width="626.078"
            height="718.984"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feGaussianBlur in="BackgroundImageFix" stdDeviation="4" />
            <feComposite
              in2="SourceAlpha"
              operator="in"
              result="effect1_backgroundBlur_235_111"
            />
            <feColorMatrix
              in="SourceAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha"
            />
            <feOffset dy="2" />
            <feGaussianBlur stdDeviation="1" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
            />
            <feBlend
              mode="normal"
              in2="effect1_backgroundBlur_235_111"
              result="effect2_dropShadow_235_111"
            />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="effect2_dropShadow_235_111"
              result="shape"
            />
          </filter>
        </defs>
      </svg>
    </>
  );
};
