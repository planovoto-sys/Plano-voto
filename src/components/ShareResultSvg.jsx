import React, { forwardRef } from 'react';
import {
  GAUGE_PATH,
  GAUGE_SEGMENTS,
  getGaugeProgress,
  getGaugeSegmentFill,
  normalizeGaugeScore
} from '../utils/gaugeSvg';

export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1920;

const COLORS = {
  background: '#f4eb93',
  header: '#639863',
  scoreCard: '#f2e067',
  textDark: '#4a4a4a',
  textLight: '#f4eb93',
  white: '#ffffff',
  shadow: 'rgba(74, 74, 74, 0.18)',
  stripeYellow: '#f2e067'
};

const FONT_FAMILY = 'Arial, Helvetica, sans-serif';
const GAUGE_TRANSFORM = 'translate(60 348) scale(3)';
const GAUGE_CENTER_X = 540;
const GAUGE_CENTER_Y = 840;
const GAUGE_NEEDLE_LENGTH = 270;
const GAUGE_NEEDLE_TAIL = 58;

const formatShareScore = (value) => (
  normalizeGaugeScore(value).toFixed(2).replace('.', ',')
);

const getResultCopy = (score) => {
  const normalizedScore = normalizeGaugeScore(score);

  if (normalizedScore >= 7) {
    return {
      title: 'GOLAÇO!!!',
      subtitle: 'MEU VOTO MELHORA O CONGRESSO'
    };
  }

  if (normalizedScore >= 6) {
    return {
      title: 'NA TRAVE!!!',
      subtitle: 'MEU VOTO NÃO MELHORA O CONGRESSO'
    };
  }

  return {
    title: 'BOLA FORA!!!',
    subtitle: 'MEU VOTO PIORA O CONGRESSO'
  };
};

const getNeedlePoints = (score) => {
  const progress = normalizeGaugeScore(score) * 10;
  const angle = (180 - (progress * 1.8)) * (Math.PI / 180);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x1: GAUGE_CENTER_X - (GAUGE_NEEDLE_TAIL * cos),
    y1: GAUGE_CENTER_Y + (GAUGE_NEEDLE_TAIL * sin),
    x2: GAUGE_CENTER_X + (GAUGE_NEEDLE_LENGTH * cos),
    y2: GAUGE_CENTER_Y - (GAUGE_NEEDLE_LENGTH * sin)
  };
};

const GaugeArc = ({ score }) => {
  const progress = getGaugeProgress(score);
  const needle = getNeedlePoints(score);

  return (
    <>
      <g transform={GAUGE_TRANSFORM}>
        {GAUGE_SEGMENTS.map((segment) => (
          <path
            key={`share-segment-${segment.offset}-${segment.length}`}
            d={GAUGE_PATH}
            pathLength="100"
            strokeDasharray={`${segment.length} 100`}
            strokeDashoffset={-segment.offset}
            stroke={segment.color}
            strokeWidth="30"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            fill="none"
            opacity="0.24"
          />
        ))}

        {GAUGE_SEGMENTS.map((segment) => {
          const filledLength = getGaugeSegmentFill(segment, progress);
          if (filledLength <= 0) return null;

          return (
            <path
              key={`share-fill-${segment.offset}-${segment.length}`}
              d={GAUGE_PATH}
              pathLength="100"
              strokeDasharray={`${filledLength} 100`}
              strokeDashoffset={-segment.offset}
              stroke={segment.color}
              strokeWidth="30"
              strokeLinecap="butt"
              strokeLinejoin="miter"
              fill="none"
            />
          );
        })}
      </g>

      <g transform={GAUGE_TRANSFORM}>
        {GAUGE_SEGMENTS.map((segment) => (
          <path
            key={`share-outline-${segment.offset}-${segment.length}`}
            d={GAUGE_PATH}
            pathLength="100"
            strokeDasharray={`${segment.length} 100`}
            strokeDashoffset={-segment.offset}
            stroke="#000000"
            strokeWidth="30"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            fill="none"
            opacity="0.03"
          />
        ))}
      </g>

      <line
        x1={needle.x1}
        y1={needle.y1}
        x2={needle.x2}
        y2={needle.y2}
        stroke="#000000"
        strokeWidth="8"
        strokeLinecap="butt"
      />
      <circle cx={GAUGE_CENTER_X} cy={GAUGE_CENTER_Y} r="29" fill="#000000" />
    </>
  );
};

const ShareResultSvg = forwardRef(function ShareResultSvg({ score }, ref) {
  const { title, subtitle } = getResultCopy(score);
  const formattedScore = formatShareScore(score);
  const titleFontSize = title.length > 10 ? 70 : 86;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={SHARE_IMAGE_WIDTH}
      height={SHARE_IMAGE_HEIGHT}
      viewBox={`0 0 ${SHARE_IMAGE_WIDTH} ${SHARE_IMAGE_HEIGHT}`}
      role="img"
      aria-label={`${title} Nota ${formattedScore}. ${subtitle}`}
      shapeRendering="geometricPrecision"
    >
      <rect width="1080" height="1920" fill={COLORS.background} />

      <rect x="0" y="72" width="1080" height="254" fill={COLORS.header} />
      <polygon points="424,326 656,326 540,376" fill={COLORS.header} />

      <text
        x="540"
        y="198"
        fill={COLORS.textLight}
        fontFamily={FONT_FAMILY}
        fontSize={titleFontSize}
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="8"
      >
        {title}
      </text>

      <GaugeArc score={score} />

      <rect x="122" y="924" width="860" height="545" rx="24" fill={COLORS.shadow} opacity="0.22" />
      <rect x="108" y="910" width="864" height="545" rx="24" fill={COLORS.scoreCard} />

      <text
        x="540"
        y="1070"
        fill="#000000"
        fontFamily={FONT_FAMILY}
        fontSize="78"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="3"
      >
        NOTA
      </text>

      <text
        x="540"
        y="1260"
        fill="#000000"
        fontFamily={FONT_FAMILY}
        fontSize="214"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {formattedScore}
      </text>

      <text
        x="540"
        y="1564"
        fill="#000000"
        fontFamily={FONT_FAMILY}
        fontSize="39"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="8"
      >
        {subtitle}
      </text>

      <rect x="108" y="1652" width="864" height="224" rx="24" fill={COLORS.header} />
      <text
        x="540"
        y="1764"
        fill={COLORS.textLight}
        fontFamily={FONT_FAMILY}
        fontSize="76"
        fontWeight="900"
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="13"
      >
        meuvoto.org
      </text>

      <g transform="rotate(-45 995 1906)">
        <rect x="820" y="1882" width="520" height="26" fill={COLORS.header} />
        <rect x="820" y="1926" width="520" height="26" fill={COLORS.stripeYellow} />
      </g>
    </svg>
  );
});

export default ShareResultSvg;
