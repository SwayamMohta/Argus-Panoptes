import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
  Line,
  Polygon,
} from 'react-native-svg';

export const CivicSaluteBannerSvg = ({ width = '100%', height = '100%' }) => {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 600 160"
      preserveAspectRatio="xMidYMid slice"
    >
      <Defs>
        {/* Morning Civic Sky Gradient */}
        <LinearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#D9EEF2" />
          <Stop offset="45%" stopColor="#F5F3E6" />
          <Stop offset="100%" stopColor="#F9E8D2" />
        </LinearGradient>

        {/* Distant Mist Gradient */}
        <LinearGradient id="mistGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#E3ECE9" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#CADBD4" stopOpacity="0.95" />
        </LinearGradient>

        {/* Distant Hills Gradient */}
        <LinearGradient id="hillFar" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8EAFA2" />
          <Stop offset="100%" stopColor="#6C9283" />
        </LinearGradient>

        {/* Midground Park Lawn Gradient */}
        <LinearGradient id="hillMid" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#4F8265" />
          <Stop offset="100%" stopColor="#35684A" />
        </LinearGradient>

        {/* Foreground Knoll Gradient */}
        <LinearGradient id="hillFront" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#25593A" />
          <Stop offset="100%" stopColor="#183D26" />
        </LinearGradient>

        {/* Subtle Sun Glow Gradient */}
        <LinearGradient id="sunGlow" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FED8A6" stopOpacity="0.3" />
        </LinearGradient>

        {/* Flag Saffron Wave Gradient */}
        <LinearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#FF7A18" />
          <Stop offset="50%" stopColor="#FFA048" />
          <Stop offset="100%" stopColor="#FF6B00" />
        </LinearGradient>

        {/* Flag White Wave Gradient */}
        <LinearGradient id="whiteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#F5F5F7" />
          <Stop offset="50%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor="#E5E7EB" />
        </LinearGradient>

        {/* Flag Green Wave Gradient */}
        <LinearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%" stopColor="#0E7828" />
          <Stop offset="50%" stopColor="#1AA83E" />
          <Stop offset="100%" stopColor="#0B6620" />
        </LinearGradient>
      </Defs>

      {/* 1. Sky Canvas */}
      <Rect x="0" y="0" width="600" height="160" fill="url(#skyGrad)" />

      {/* 2. Soft Rising Sun */}
      <Circle cx="390" cy="55" r="32" fill="url(#sunGlow)" />
      <Circle cx="390" cy="55" r="22" fill="#FFFDF8" opacity="0.85" />

      {/* 3. Soft Ambient Clouds & Sunbeams */}
      <Path
        d="M20 40 Q 60 25, 110 38 Q 150 48, 190 35 Q 230 24, 280 34 C 210 52, 90 52, 20 40 Z"
        fill="#FFFFFF"
        opacity="0.45"
      />
      <Path
        d="M420 30 Q 470 18, 520 28 Q 560 36, 595 25 C 550 42, 460 42, 420 30 Z"
        fill="#FFFFFF"
        opacity="0.35"
      />

      {/* 4. Distant Cityline / Heritage Monument Silhouettes */}
      <Path
        d="M0 115 L40 112 L70 115 L95 108 L110 115 L140 114 L170 109 L200 114 L240 111 L280 115 L330 112 L370 115 L420 110 L460 115 L510 111 L560 115 L600 113 L600 160 L0 160 Z"
        fill="url(#mistGrad)"
      />

      {/* 5. Distant Rolling Park Hills */}
      <Path
        d="M0 118 Q 120 96, 260 110 T 540 104 Q 575 106, 600 112 L600 160 L0 160 Z"
        fill="url(#hillFar)"
      />

      {/* 6. Distant Park Tree Clusters */}
      <G fill="#567E6C">
        <Circle cx="80" cy="106" r="14" />
        <Circle cx="95" cy="104" r="18" />
        <Circle cx="112" cy="107" r="13" />

        <Circle cx="210" cy="104" r="12" />
        <Circle cx="225" cy="102" r="15" />
        <Circle cx="240" cy="105" r="11" />

        <Circle cx="480" cy="102" r="16" />
        <Circle cx="500" cy="98" r="20" />
        <Circle cx="522" cy="103" r="15" />
      </G>

      {/* 7. Midground Park Landscape with Pathway */}
      <Path
        d="M0 126 Q 160 108, 340 120 Q 480 114, 600 122 L600 160 L0 160 Z"
        fill="url(#hillMid)"
      />

      {/* Clean Park Path winding towards flag */}
      <Path
        d="M240 160 Q 300 138, 380 128 Q 420 122, 450 121 L465 124 Q 430 132, 340 144 Q 280 152, 260 160 Z"
        fill="#C9BEA8"
        opacity="0.7"
      />

      {/* 8. Park Trees on Midground */}
      <G fill="#2D5C40">
        <Circle cx="30" cy="120" r="18" />
        <Circle cx="48" cy="116" r="22" />
        <Circle cx="68" cy="121" r="16" />

        <Circle cx="540" cy="115" r="20" />
        <Circle cx="562" cy="110" r="24" />
        <Circle cx="585" cy="116" r="18" />
      </G>

      {/* 9. Foreground Green Knoll (Where the person stands) */}
      <Path
        d="M0 135 Q 110 124, 230 138 Q 360 130, 520 144 Q 570 140, 600 142 L600 160 L0 160 Z"
        fill="url(#hillFront)"
      />

      {/* Delicate Grass Tuft Highlights on Foreground */}
      <G stroke="#3F7A54" strokeWidth="1.5" strokeLinecap="round">
        <Line x1="45" y1="138" x2="43" y2="131" />
        <Line x1="48" y1="138" x2="49" y2="129" />
        <Line x1="51" y1="139" x2="54" y2="132" />

        <Line x1="165" y1="140" x2="162" y2="133" />
        <Line x1="168" y1="140" x2="169" y2="131" />

        <Line x1="480" y1="148" x2="477" y2="140" />
        <Line x1="484" y1="148" x2="487" y2="139" />
      </G>

      {/* ===================================================
          10. MONUMENTAL FLAGPOLE & INDIAN TRICOLOR FLAG
      =================================================== */}
      <G>
        {/* Flagpole Pedestal Base */}
        <Polygon points="440,132 460,132 464,136 436,136" fill="#78848E" />
        <Polygon points="434,136 466,136 470,140 430,140" fill="#4B5660" />

        {/* Tall Flagpole Mast */}
        <Line x1="450" y1="12" x2="450" y2="132" stroke="#FFFFFF" strokeWidth="3" />
        <Line x1="451" y1="12" x2="451" y2="132" stroke="#B0BAC3" strokeWidth="1" />

        {/* Golden Finial Sphere on top of Mast */}
        <Circle cx="450" cy="10" r="3.5" fill="#F5C042" />

        {/* Halyard Cord Rigging */}
        <Line x1="448.5" y1="12" x2="448.5" y2="132" stroke="#E2E6EA" strokeWidth="0.75" strokeDasharray="2,2" />

        {/* ---- THE INDIAN TRICOLOR (Fluttering in Wind) ---- */}
        {/* Top Band: Saffron */}
        <Path
          d="M451 14 C 475 9, 500 22, 530 15 C 555 9, 570 17, 582 14 L580 26 C 568 29, 552 21, 528 27 C 498 34, 475 21, 451 26 Z"
          fill="url(#saffronGrad)"
        />

        {/* Middle Band: White */}
        <Path
          d="M451 26 C 475 21, 498 34, 528 27 C 552 21, 568 29, 580 26 L578 38 C 566 41, 550 33, 526 39 C 496 46, 475 33, 451 38 Z"
          fill="url(#whiteGrad)"
        />

        {/* Bottom Band: Green */}
        <Path
          d="M451 38 C 475 33, 496 46, 526 39 C 550 33, 566 41, 578 38 L576 50 C 564 53, 548 45, 524 51 C 494 58, 475 45, 451 50 Z"
          fill="url(#greenGrad)"
        />

        {/* Ashoka Chakra (Navy Blue Wheel in center) */}
        <G transform="translate(514, 32.5)">
          <Circle cx="0" cy="0" r="4.2" stroke="#000088" strokeWidth="0.8" fill="none" />
          <Circle cx="0" cy="0" r="1.1" fill="#000088" />
          {/* Chakra Spokes (8 symmetric radiating lines simulating 24 spokes) */}
          <Line x1="-3.8" y1="0" x2="3.8" y2="0" stroke="#000088" strokeWidth="0.5" />
          <Line x1="0" y1="-3.8" x2="0" y2="3.8" stroke="#000088" strokeWidth="0.5" />
          <Line x1="-2.7" y1="-2.7" x2="2.7" y2="2.7" stroke="#000088" strokeWidth="0.5" />
          <Line x1="-2.7" y1="2.7" x2="2.7" y2="-2.7" stroke="#000088" strokeWidth="0.5" />
          <Line x1="-3.5" y1="-1.5" x2="3.5" y2="1.5" stroke="#000088" strokeWidth="0.4" />
          <Line x1="-1.5" y1="-3.5" x2="1.5" y2="3.5" stroke="#000088" strokeWidth="0.4" />
          <Line x1="-3.5" y1="1.5" x2="3.5" y2="-1.5" stroke="#000088" strokeWidth="0.4" />
          <Line x1="1.5" y1="-3.5" x2="-1.5" y2="3.5" stroke="#000088" strokeWidth="0.4" />
        </G>
      </G>

      {/* ===================================================
          11. THE SALUTING CITIZEN AUDITOR (Aesthetic Vector Figure)
          Positioned on the left foreground, looking up at flag
      =================================================== */}
      <G transform="translate(108, 92)">
        {/* Cast Shadow on grass */}
        <Path d="M-6 48 Q 4 52, 18 48 Q 6 45, -6 48 Z" fill="#0E2918" opacity="0.6" />

        {/* Left Leg & Pant (Straight, grounded) */}
        <Path
          d="M2 30 L0 46 L-4 48 L1 48 L5 30 Z"
          fill="#1C2530"
        />

        {/* Right Leg & Pant (Slightly forward, solid stance) */}
        <Path
          d="M6 30 L8 46 L5 48 L10 48 L11 30 Z"
          fill="#253240"
        />

        {/* Shoes */}
        <Path d="M-5 46 L2 46 L1 48 L-5 48 Z" fill="#11161B" />
        <Path d="M4 46 L11 46 L10 48 L4 48 Z" fill="#11161B" />

        {/* Torso / Jacket (Stood upright, proud posture) */}
        <Path
          d="M0 16 L-2 31 L8 31 L8 16 Z"
          fill="#1F2A38"
        />
        {/* Jacket Collar / Civic Lapel */}
        <Path
          d="M0 16 L4 25 L8 16 L5 15 Z"
          fill="#2A384A"
        />

        {/* Left Arm (Relaxed by side) */}
        <Path
          d="M-2 17 L-5 28 L-4 34 L-2 34 L-1 28 L0 18 Z"
          fill="#18212C"
        />

        {/* Neck (Tilted up towards flag) */}
        <Path
          d="M2 12 L5 12 L5 16 L2 16 Z"
          fill="#D9A882"
        />

        {/* Head & Face Profile (Gazing upward at ~38 degrees) */}
        <Path
          d="M1 8 C 1 4, 3 3, 6 3 C 9 3, 10 5, 10 8 C 10 9, 9 12, 7 13 L3 13 C 1 12, 1 10, 1 8 Z"
          fill="#E5B894"
        />
        {/* Jawline & Chin tilted up towards flag */}
        <Polygon points="6,9 10,8 8,12 5,12" fill="#D9A882" />

        {/* Hair (Trim, neat silhouette) */}
        <Path
          d="M1 8 C 0 5, 2 2, 6 2 C 8 2, 10 3, 9 6 C 7 5, 4 5, 3 8 C 2 9, 1 9, 1 8 Z"
          fill="#1C2024"
        />

        {/* Right Arm in Formal Salute to Forehead */}
        {/* Upper Arm raised upward-right */}
        <Path
          d="M7 17 L15 13 L17 15 L8 20 Z"
          fill="#233040"
        />
        {/* Forearm bent crisply towards brow */}
        <Path
          d="M15 13 L9 8 L10 6 L17 15 Z"
          fill="#2C3B4E"
        />
        {/* Saluting Hand at brow */}
        <Polygon points="9,8 7,7 9,5 11,6" fill="#E5B894" />
      </G>

      {/* 12. Birds in Distant Freedom Flight */}
      <G stroke="#55756B" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <Path d="M280 28 Q 284 24, 288 28 Q 292 24, 296 28" />
        <Path d="M305 22 Q 308 19, 312 22 Q 315 19, 318 22" />
        <Path d="M325 29 Q 328 26, 331 29 Q 334 26, 337 29" />
      </G>
    </Svg>
  );
};
