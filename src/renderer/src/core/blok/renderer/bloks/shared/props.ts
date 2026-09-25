import type * as React from 'react';
import {cva} from 'class-variance-authority';
import * as z from 'zod';
import {useValue, type BlokPropHandle} from '../../runtime';
import {
  alignSchema,
  boolSchema,
  justifySchema,
  numberSchema,
  overflowSchema,
  sizeSchema,
  spacingSchema,
  textAlignSchema,
  textSizeSchema,
  textToneSchema,
  textWeightSchema,
} from './schemas';
import {BlokPropSchemas} from '../../runtime';

export type BaseLayoutProps = {
  gap?: string;
  padding?: string;
  margin?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  background?: string;
  color?: string;
  borderColor?: string;
  radius?: string;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  grow?: number;
  shrink?: number;
};

export type BaseLayoutBlok = {
  gap?: BlokPropHandle<typeof spacingSchema>;
  padding?: BlokPropHandle<typeof spacingSchema>;
  margin?: BlokPropHandle<typeof spacingSchema>;
  width?: BlokPropHandle<typeof sizeSchema>;
  minWidth?: BlokPropHandle<typeof sizeSchema>;
  maxWidth?: BlokPropHandle<typeof sizeSchema>;
  height?: BlokPropHandle<typeof sizeSchema>;
  minHeight?: BlokPropHandle<typeof sizeSchema>;
  maxHeight?: BlokPropHandle<typeof sizeSchema>;
  background?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  color?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  borderColor?: BlokPropHandle<z.ZodOptional<typeof BlokPropSchemas.DynamicString>>;
  radius?: BlokPropHandle<typeof sizeSchema>;
  overflow?: BlokPropHandle<typeof overflowSchema>;
  grow?: BlokPropHandle<typeof numberSchema>;
  shrink?: BlokPropHandle<typeof numberSchema>;
};

export type TextPresentationBlok = {
  tone?: BlokPropHandle<typeof textToneSchema>;
  size?: BlokPropHandle<typeof textSizeSchema>;
  weight?: BlokPropHandle<typeof textWeightSchema>;
  align?: BlokPropHandle<typeof textAlignSchema>;
  mono?: BlokPropHandle<typeof boolSchema>;
  italic?: BlokPropHandle<typeof boolSchema>;
  truncate?: BlokPropHandle<typeof boolSchema>;
};

export const buildLayoutStyle = (props: BaseLayoutProps): React.CSSProperties => ({
  gap: props.gap,
  padding: props.padding,
  margin: props.margin,
  width: props.width,
  minWidth: props.minWidth,
  maxWidth: props.maxWidth,
  height: props.height,
  minHeight: props.minHeight,
  maxHeight: props.maxHeight,
  background: props.background,
  color: props.color,
  borderColor: props.borderColor,
  borderRadius: props.radius,
  overflow: props.overflow,
  flexGrow: props.grow,
  flexShrink: props.shrink,
});

export const useBaseLayoutProps = (blok: BaseLayoutBlok): BaseLayoutProps => {
  const gap = useValue(blok.gap);
  const padding = useValue(blok.padding);
  const margin = useValue(blok.margin);
  const width = useValue(blok.width);
  const minWidth = useValue(blok.minWidth);
  const maxWidth = useValue(blok.maxWidth);
  const height = useValue(blok.height);
  const minHeight = useValue(blok.minHeight);
  const maxHeight = useValue(blok.maxHeight);
  const background = useValue(blok.background);
  const color = useValue(blok.color);
  const borderColor = useValue(blok.borderColor);
  const radius = useValue(blok.radius);
  const overflow = useValue(blok.overflow);
  const grow = useValue(blok.grow);
  const shrink = useValue(blok.shrink);

  return {
    gap,
    padding,
    margin,
    width,
    minWidth,
    maxWidth,
    height,
    minHeight,
    maxHeight,
    background,
    color,
    borderColor,
    radius,
    overflow,
    grow,
    shrink,
  };
};

export const useTextPresentationProps = (blok: TextPresentationBlok) => {
  const tone = useValue(blok.tone);
  const size = useValue(blok.size);
  const weight = useValue(blok.weight);
  const align = useValue(blok.align);
  const mono = useValue(blok.mono);
  const italic = useValue(blok.italic);
  const truncate = useValue(blok.truncate);

  return {tone, size, weight, align, mono, italic, truncate};
};

export const mapJustify = (justify?: z.infer<typeof justifySchema>) => {
  switch (justify) {
    case 'center':
      return 'justify-center';
    case 'end':
      return 'justify-end';
    case 'between':
      return 'justify-between';
    case 'around':
      return 'justify-around';
    case 'evenly':
      return 'justify-evenly';
    case 'start':
    default:
      return 'justify-start';
  }
};

export const mapAlign = (align?: z.infer<typeof alignSchema>) => {
  switch (align) {
    case 'center':
      return 'items-center';
    case 'end':
      return 'items-end';
    case 'baseline':
      return 'items-baseline';
    case 'stretch':
      return 'items-stretch';
    case 'start':
    default:
      return 'items-start';
  }
};

export const mapTextAlign = (align?: 'start' | 'center' | 'end') => {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'end':
      return 'text-right';
    case 'start':
    default:
      return 'text-left';
  }
};

export const textVariants = cva('text-sm leading-relaxed', {
  variants: {
    tone: {
      default: 'text-foreground',
      muted: 'text-muted-foreground',
      destructive: 'text-destructive',
      success: 'text-emerald-600 dark:text-emerald-400',
    },
    size: {
      xs: 'text-xs leading-relaxed',
      sm: 'text-sm leading-relaxed',
      base: 'text-base leading-7',
      lg: 'text-lg leading-8',
    },
    weight: {
      regular: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
  },
  defaultVariants: {
    tone: 'default',
    size: 'sm',
    weight: 'regular',
  },
});

/** Convenience: the class list every text-bearing blok composes. */
export const textPresentationClasses = (
  presentation: ReturnType<typeof useTextPresentationProps>,
): Array<string | false | undefined> => [
  textVariants({
    tone: presentation.tone,
    size: presentation.size,
    weight: presentation.weight,
  }),
  mapTextAlign(presentation.align),
  presentation.mono && 'font-mono',
  presentation.italic && 'italic',
  presentation.truncate && 'truncate',
];
