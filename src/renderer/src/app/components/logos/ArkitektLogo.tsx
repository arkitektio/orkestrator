/**
 *
 * The Arkitekt logo is a custom logo that is used in the Arkitekt application.
 * It renders a svg logo that is used in the Arkitekt application.
 * @todo: The a doesnt get rendered in firexfox, this needs to be fixed.
 */

export const ArkitektLogo = ({
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
          <g filter="url(#filter2_bd_235_111)">
            <path
              d="M1213.35 1639.12C1169.86 1639.12 1131.11 1631.58 1097.1 1616.5C1063.08 1601.12 1036.16 1578.5 1016.35 1548.64C996.824 1518.48 987.062 1480.93 987.062 1435.98C987.062 1398.14 994.014 1366.35 1007.92 1340.63C1021.82 1314.9 1040.75 1294.21 1064.71 1278.53C1088.67 1262.86 1115.88 1251.04 1146.35 1243.05C1177.11 1235.07 1209.35 1229.45 1243.07 1226.2C1282.71 1222.06 1314.66 1218.22 1338.91 1214.67C1363.17 1210.82 1380.77 1205.21 1391.71 1197.81C1402.66 1190.42 1408.13 1179.48 1408.13 1164.99V1162.33C1408.13 1134.24 1399.25 1112.51 1381.51 1097.13C1364.05 1081.76 1339.21 1074.07 1306.97 1074.07C1272.95 1074.07 1245.88 1081.61 1225.77 1096.69C1205.66 1111.47 1192.34 1130.1 1185.84 1152.57L1011.02 1138.38C1019.9 1096.99 1037.35 1061.21 1063.38 1031.05C1089.41 1000.59 1122.98 977.235 1164.1 960.972C1205.51 944.414 1253.43 936.135 1307.85 936.135C1345.71 936.135 1381.95 940.57 1416.56 949.44C1451.46 958.311 1482.37 972.06 1509.29 990.688C1536.5 1009.32 1557.95 1033.27 1573.62 1062.54C1589.3 1091.52 1597.14 1126.26 1597.14 1166.77V1626.26H1417.89V1531.79H1412.56C1401.62 1553.08 1386.98 1571.85 1368.64 1588.11C1350.3 1604.08 1328.26 1616.65 1302.53 1625.81C1276.79 1634.68 1247.07 1639.12 1213.35 1639.12ZM1267.48 1508.72C1295.28 1508.72 1319.83 1503.25 1341.13 1492.31C1362.43 1481.08 1379.14 1466 1391.27 1447.07C1403.39 1428.15 1409.46 1406.71 1409.46 1382.76V1310.47C1403.54 1314.31 1395.41 1317.86 1385.06 1321.11C1375 1324.07 1363.61 1326.88 1350.89 1329.54C1338.17 1331.9 1325.45 1334.12 1312.73 1336.19C1300.01 1337.97 1288.48 1339.59 1278.13 1341.07C1255.94 1344.32 1236.57 1349.5 1220 1356.59C1203.44 1363.69 1190.57 1373.3 1181.4 1385.42C1172.23 1397.25 1167.65 1412.03 1167.65 1429.78C1167.65 1455.5 1176.96 1475.16 1195.6 1488.76C1214.53 1502.07 1238.49 1508.72 1267.48 1508.72Z"
              fill={aColor}
            />
          </g>
        </g>
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
